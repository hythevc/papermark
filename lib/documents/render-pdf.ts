import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";

export const MAX_INLINE_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_INLINE_PDF_PAGES = 100;

/** Read only a persisted version owned by the supplied team and document. */
export async function readOwnedPdfVersion(payload: {
  teamId: string;
  documentId: string;
  documentVersionId: string;
}) {
  const version = await prisma.documentVersion.findFirst({
    where: {
      id: payload.documentVersionId,
      documentId: payload.documentId,
      document: { teamId: payload.teamId },
    },
    include: { document: { select: { name: true } } },
  });
  if (!version) throw new Error("Document version not found.");
  let bytes: Uint8Array;
  if (version.storageType === "S3_PATH") {
    if (!version.file.startsWith(`${payload.teamId}/`))
      throw new Error("File does not belong to this workspace.");
    const { client, config } = await getTeamS3ClientAndConfig(payload.teamId);
    const object = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: version.file }),
    );
    if (!object.Body || (object.ContentLength ?? 0) > MAX_INLINE_PDF_BYTES)
      throw new Error("PDF exceeds the inline processing limit.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
      length += chunk.byteLength;
      if (length > MAX_INLINE_PDF_BYTES)
        throw new Error("PDF exceeds the inline processing limit.");
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
  } else {
    const url = new URL(version.file);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".blob.vercel-storage.com")
    )
      throw new Error("Unsupported PDF storage origin.");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get("content-length")) > MAX_INLINE_PDF_BYTES
    )
      throw new Error("PDF could not be retrieved within processing limits.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        length += result.value.byteLength;
        if (length > MAX_INLINE_PDF_BYTES)
          throw new Error("PDF exceeds the inline processing limit.");
        chunks.push(result.value);
      }
    } finally {
      await reader.cancel();
    }
    bytes = Buffer.concat(chunks);
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-")
    throw new Error("The stored file is not a PDF.");
  return { version, bytes };
}

/** Actual bounded rendering; also usable by a local worker without Trigger.dev. */
export async function renderPdfVersion(payload: {
  teamId: string;
  documentId: string;
  documentVersionId: string;
}) {
  const { version, bytes } = await readOwnedPdfVersion(payload);
  const mupdf = await import("mupdf");
  const pdf = new mupdf.PDFDocument(bytes);
  try {
    const numPages = pdf.countPages();
    if (numPages < 1 || numPages > MAX_INLINE_PDF_PAGES)
      throw new Error("PDF exceeds the inline page limit.");
    for (let index = 0; index < numPages; index++) {
      const page = pdf.loadPage(index);
      try {
        const [x0, y0, x1, y1] = page.getBounds();
        const width = x1 - x0,
          height = y1 - y0;
        if (width <= 0 || height <= 0)
          throw new Error("Invalid PDF page size.");
        const scale = Math.min(
          2,
          1600 / width,
          8000 / height,
          Math.sqrt(16000000 / (width * height)),
        );
        const pixmap = page.toPixmap(
          [scale, 0, 0, scale, 0, 0],
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        );
        try {
          const stored = await putFileServer({
            teamId: payload.teamId,
            docId: payload.documentId,
            subfolder: version.id,
            file: {
              name: `page-${index + 1}.png`,
              type: "image/png",
              buffer: Buffer.from(pixmap.asPNG()),
            },
          });
          const data = {
            file: stored.data,
            storageType: stored.type,
            embeddedLinks: [] as string[],
            metadata: {
              originalWidth: width,
              originalHeight: height,
              scaledWidth: Math.round(width * scale),
              scaledHeight: Math.round(height * scale),
              scaleFactor: scale,
            },
          };
          await prisma.documentPage.upsert({
            where: {
              pageNumber_versionId: {
                pageNumber: index + 1,
                versionId: version.id,
              },
            },
            create: { ...data, pageNumber: index + 1, versionId: version.id },
            update: data,
          });
        } finally {
          pixmap.destroy();
        }
      } finally {
        page.destroy();
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.update({
        where: { id: version.id },
        data: { numPages, hasPages: true },
      });
      const primary = await tx.documentVersion.findUnique({
        where: { id: version.id },
        select: { isPrimary: true },
      });
      if (primary?.isPrimary)
        await tx.document.update({
          where: { id: payload.documentId, teamId: payload.teamId },
          data: { numPages },
        });
    });
    return { numPages };
  } finally {
    pdf.destroy();
  }
}
