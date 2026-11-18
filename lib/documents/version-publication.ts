import type { Prisma } from "@prisma/client";

import { PapermarkApiError } from "@/lib/api/errors";
import prisma from "@/lib/prisma";

type VersionData = Pick<
  Prisma.DocumentVersionUncheckedCreateInput,
  | "file"
  | "originalFile"
  | "type"
  | "storageType"
  | "numPages"
  | "contentType"
  | "fileSize"
>;
type DocumentScope = { teamId: string; documentId: string };

/** Allocate under the same document lock used by manual redaction. */
export async function createVersionCandidate({
  teamId,
  documentId,
  data,
}: DocumentScope & { data: VersionData }) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
    const document = await tx.document.findFirst({
      where: { id: documentId, teamId },
      select: { id: true },
    });
    if (!document)
      throw new PapermarkApiError("not_found", "Document not found.");
    const [latest, primary] = await Promise.all([
      tx.documentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      }),
      tx.documentVersion.findFirst({
        where: { documentId, isPrimary: true },
        select: { id: true },
      }),
    ]);
    const version = await tx.documentVersion.create({
      data: {
        ...data,
        documentId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        isPrimary: false,
      },
    });
    return { version, previousPrimaryId: primary?.id ?? null };
  });
}

/** Publish only against the source primary observed when this candidate began. */
export async function publishVersionCandidate({
  teamId,
  documentId,
  versionId,
  previousPrimaryId,
  requirePages = false,
}: DocumentScope & {
  versionId: string;
  previousPrimaryId: string | null;
  requirePages?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
    const version = await tx.documentVersion.findFirst({
      where: { id: versionId, documentId, document: { teamId } },
    });
    if (!version)
      throw new PapermarkApiError("not_found", "Document version not found.");
    if (requirePages && (!version.hasPages || !version.numPages)) {
      throw new PapermarkApiError(
        "conflict",
        "Document pages are not ready for publication.",
      );
    }
    const primary = await tx.documentVersion.findFirst({
      where: { documentId, isPrimary: true },
      select: { id: true },
    });
    if ((primary?.id ?? null) !== previousPrimaryId) {
      throw new PapermarkApiError(
        "conflict",
        "The primary version changed during upload. Retry with the current document.",
      );
    }
    await tx.documentVersion.updateMany({
      where: { documentId, isPrimary: true },
      data: { isPrimary: false },
    });
    const published = await tx.documentVersion.update({
      where: { id: versionId },
      data: { isPrimary: true },
    });
    await tx.document.update({
      where: { id: documentId, teamId },
      data: {
        file: published.file,
        originalFile: published.originalFile,
        storageType: published.storageType,
        type: published.type,
        contentType: published.contentType,
        numPages: published.numPages,
      },
    });
    return published;
  });
}
