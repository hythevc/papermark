import { DocumentStorageType } from "@prisma/client";
import { task } from "@trigger.dev/sdk";
import { basename, extname } from "node:path";
import { PDFDocument } from "pdf-lib";

import { ONE_HOUR } from "@/lib/constants";
import { usesInlineDocumentProcessing } from "@/lib/document-processing";
import { getFile } from "@/lib/files/get-file";
import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";
import { convertPdfToImageRoute } from "@/lib/trigger/pdf-to-image-route";
import {
  convertFilesToPdfQueue,
  convertKeynoteToPdfQueue,
} from "@/lib/trigger/queues";

import {
  type ConversionKind,
  conversionProviderConfig,
  readConversionBytes,
  requestConvertedPdf,
} from "../conversion-provider";

export type ConvertDocumentPayload = {
  teamId: string;
  documentId: string;
  documentVersionId: string;
};

export function assertConversionScope(
  payload: ConvertDocumentPayload,
  version: {
    id: string;
    documentId: string;
    document: { teamId: string };
    file: string;
    originalFile: string | null;
    storageType: DocumentStorageType;
  },
) {
  if (
    !payload.teamId ||
    !payload.documentId ||
    !payload.documentVersionId ||
    version.id !== payload.documentVersionId ||
    version.documentId !== payload.documentId ||
    version.document.teamId !== payload.teamId
  ) {
    throw new Error("Document version is unavailable in this team.");
  }
  if (
    version.storageType === DocumentStorageType.S3_PATH &&
    (!version.file.startsWith(`${payload.teamId}/`) ||
      (version.originalFile &&
        !version.originalFile.startsWith(`${payload.teamId}/`)))
  ) {
    throw new Error("Document storage is outside this team.");
  }
  if (version.storageType === DocumentStorageType.VERCEL_BLOB) {
    for (const file of [version.file, version.originalFile].filter(
      (file): file is string => !!file,
    )) {
      const url = new URL(file);
      if (
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".blob.vercel-storage.com") ||
        url.username ||
        url.password
      ) {
        throw new Error("Unsupported conversion storage origin.");
      }
    }
  }
}

async function renderPages(payload: ConvertDocumentPayload) {
  if (usesInlineDocumentProcessing()) {
    const { renderPdfVersion } = await import("@/lib/documents/render-pdf");
    await renderPdfVersion(payload);
  } else {
    const result = await convertPdfToImageRoute.triggerAndWait(payload);
    if (!result.ok)
      throw new Error("PDF page processing failed after conversion.");
  }
}

/** Plain entry point supports the same real conversion in local and worker runtimes. */
export async function convertDocumentVersion(
  payload: ConvertDocumentPayload,
  kind: ConversionKind = "office",
) {
  if (
    [payload.teamId, payload.documentId, payload.documentVersionId].some(
      (value) => typeof value !== "string" || value.trim().length === 0,
    )
  )
    throw new Error(
      "Team, document and version identifiers are required for conversion.",
    );
  const version = await prisma.documentVersion.findFirst({
    where: {
      id: payload.documentVersionId,
      documentId: payload.documentId,
      document: { teamId: payload.teamId },
    },
    select: {
      id: true,
      documentId: true,
      file: true,
      originalFile: true,
      storageType: true,
      type: true,
      contentType: true,
      isPrimary: true,
      hasPages: true,
      document: { select: { teamId: true, name: true } },
    },
  });
  if (!version)
    throw new Error("Document version is unavailable in this team.");
  assertConversionScope(payload, version);

  // A retry can resume page rendering without re-converting or changing the original.
  if (
    version.type === "pdf" &&
    version.originalFile &&
    version.originalFile !== version.file
  ) {
    if (!version.hasPages) await renderPages(payload);
    return { documentVersionId: version.id, status: "converted" as const };
  }
  if (version.type !== "docs" && version.type !== "slides")
    throw new Error("This document version is not an Office or Keynote file.");
  const isKeynote =
    version.contentType === "application/vnd.apple.keynote" ||
    version.contentType === "application/x-iwork-keynote-sffkey" ||
    extname(version.document.name).toLowerCase() === ".key";
  if ((kind === "keynote") !== isKeynote)
    throw new Error(
      "The conversion provider does not match this document type.",
    );
  // Fail before retrieving confidential content if the required service is absent.
  conversionProviderConfig(kind);
  const sourceKey = version.originalFile ?? version.file;
  const signedUrl = await getFile({
    type: version.storageType,
    data: sourceKey,
    expiresIn: ONE_HOUR,
  });
  const input = await readConversionBytes(
    await fetch(signedUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    }),
  );
  const contentType = version.contentType ?? "application/octet-stream";
  const output = await requestConvertedPdf({
    kind,
    bytes: input,
    filename: basename(version.document.name),
    contentType,
  });
  // Parsing rejects corrupt/encrypted provider responses before any database mutation.
  const pdf = await PDFDocument.load(new Uint8Array(output));
  const numPages = pdf.getPageCount();
  if (numPages === 0)
    throw new Error("Conversion produced a PDF with no pages.");
  const firstPage = pdf.getPage(0).getSize();

  // A version has one storageType for both files. Migrate a legacy Blob original
  // alongside the PDF so the existing original-download route keeps working.
  const original =
    version.storageType === DocumentStorageType.S3_PATH
      ? { data: sourceKey }
      : await putFileServer({
          teamId: payload.teamId,
          docId: payload.documentId,
          restricted: false,
          file: {
            name: `${version.id}-original${extname(version.document.name)}`,
            type: contentType,
            buffer: input,
          },
        });
  const converted = await putFileServer({
    teamId: payload.teamId,
    docId: payload.documentId,
    file: {
      name: `${version.id}.pdf`,
      type: "application/pdf",
      buffer: output,
    },
  });
  await prisma.$transaction(async (tx) => {
    const current = await tx.documentVersion.findUnique({
      where: { id: version.id },
      select: { file: true, isPrimary: true },
    });
    if (!current || current.file !== version.file)
      throw new Error(
        "Document version changed during conversion; retry the current version.",
      );
    const fields = {
      file: converted.data,
      originalFile: original.data,
      storageType: converted.type,
      type: "pdf",
      contentType: "application/pdf",
      numPages,
    };
    await tx.documentVersion.update({
      where: { id: version.id },
      data: {
        ...fields,
        fileSize: output.length,
        hasPages: false,
        isVertical: firstPage.height >= firstPage.width,
      },
    });
    if (current.isPrimary)
      await tx.document.update({
        where: { id: payload.documentId, teamId: payload.teamId },
        data: fields,
      });
  });
  await renderPages(payload);
  return { documentVersionId: version.id, status: "converted" as const };
}

export const convertFilesToPdfTask = task({
  id: "convert-files-to-pdf",
  queue: convertFilesToPdfQueue,
  machine: { preset: "medium-1x" },
  retry: { maxAttempts: 2 },
  run: (payload: ConvertDocumentPayload) =>
    convertDocumentVersion(payload, "office"),
});

export const convertKeynoteToPdfTask = task({
  id: "convert-keynote-to-pdf",
  queue: convertKeynoteToPdfQueue,
  machine: { preset: "medium-1x" },
  retry: { maxAttempts: 2 },
  run: (payload: ConvertDocumentPayload) =>
    convertDocumentVersion(payload, "keynote"),
});
