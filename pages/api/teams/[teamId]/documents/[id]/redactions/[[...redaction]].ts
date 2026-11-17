import type { NextApiRequest, NextApiResponse } from "next";

import {
  inspectPdf,
  redactToFlattenedPdf,
  regionSchema,
  sourcePagePng,
} from "@/ee/features/redaction/lib/manual-redaction";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { PapermarkApiError } from "@/lib/api/errors";
import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import {
  readOwnedPdfVersion,
  renderPdfVersion,
} from "@/lib/documents/render-pdf";
import { errorhandler } from "@/lib/errorHandler";
import { getFeatureFlags } from "@/lib/featureFlags";
import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";
import type { CustomUser } from "@/lib/types";

export const config = { maxDuration: 300 };
const identity = z.object({
  teamId: z.string().min(1),
  id: z.string().min(1),
  redaction: z.array(z.string().min(1)).optional(),
});
const jobSelect = {
  id: true,
  status: true,
  error: true,
  resultVersionId: true,
  createdAt: true,
  documentVersionId: true,
} as const;

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  try {
    const scope = identity.safeParse(req.query);
    if (!scope.success)
      throw new PapermarkApiError("bad_request", "Invalid redaction route.");
    const { teamId, id: documentId, redaction: parts = [] } = scope.data;
    const session = await getServerSession(req, res, authOptions);
    const userId = (session?.user as CustomUser | undefined)?.id;
    if (!userId)
      throw new PapermarkApiError("unauthorized", "Sign in to continue.");
    const membership = await prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: { role: true, status: true, blockedAt: true },
    });
    if (
      !membership ||
      membership.status !== "ACTIVE" ||
      membership.blockedAt ||
      !hasAllPermissions(membership.role, ["documents.read", "documents.write"])
    )
      throw new PapermarkApiError(
        "forbidden",
        "You cannot edit this workspace's documents.",
      );
    const document = await prisma.document.findFirst({
      where: { id: documentId, teamId },
      select: { id: true, name: true },
    });
    if (!document)
      throw new PapermarkApiError("not_found", "Document not found.");
    if (!(await getFeatureFlags({ teamId })).redaction)
      throw new PapermarkApiError(
        "forbidden",
        "Manual redaction is not enabled for this workspace.",
      );
    if (parts.length === 0) {
      if (req.method === "GET")
        return res.status(200).json({
          jobs: await prisma.documentRedactionJob.findMany({
            where: { teamId, documentId },
            select: jobSelect,
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        });
      if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
      }
      const version = await prisma.documentVersion.findFirst({
        where: { documentId, isPrimary: true },
        orderBy: { versionNumber: "desc" },
        select: { id: true },
      });
      if (!version)
        throw new PapermarkApiError(
          "unprocessable_entity",
          "Upload a PDF version first.",
        );
      const source = await readOwnedPdfVersion({
        teamId,
        documentId,
        documentVersionId: version.id,
      });
      const numPages = await inspectPdf(source.bytes);
      await prisma.documentVersion.update({
        where: { id: version.id },
        data: { numPages },
      });
      const job = await prisma.documentRedactionJob.create({
        data: {
          teamId,
          documentId,
          documentVersionId: version.id,
          createdById: userId,
          status: "REVIEW",
          customTerms: [],
          reasons: ["OTHER"],
        },
        select: { id: true },
      });
      return res.status(201).json(job);
    }
    const jobId = parts[0];
    const job = await prisma.documentRedactionJob.findFirst({
      where: { id: jobId, teamId, documentId },
      select: {
        ...jobSelect,
        redactions: { orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }] },
        documentVersion: { select: { numPages: true } },
      },
    });
    if (!job)
      throw new PapermarkApiError("not_found", "Redaction job not found.");
    const numPages = job.documentVersion.numPages;
    if (parts.length === 3 && parts[1] === "page" && req.method === "GET") {
      const pageNumber = Number(parts[2]);
      if (
        !Number.isInteger(pageNumber) ||
        !numPages ||
        pageNumber < 1 ||
        pageNumber > numPages
      )
        throw new PapermarkApiError("not_found", "Page not found.");
      const source = await readOwnedPdfVersion({
        teamId,
        documentId,
        documentVersionId: job.documentVersionId,
      });
      const png = await sourcePagePng(source.bytes, pageNumber);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(png);
    }
    if (parts.length !== 1)
      throw new PapermarkApiError("not_found", "Redaction route not found.");
    if (req.method === "GET") {
      const { redactions, documentVersion, ...metadata } = job;
      return res
        .status(200)
        .json({ job: metadata, regions: redactions, numPages });
    }
    if (req.method === "PATCH") {
      const operation = z
        .discriminatedUnion("action", [
          z
            .object({
              action: z.literal("add"),
              pageNumber: z.number(),
              x: z.number(),
              y: z.number(),
              width: z.number(),
              height: z.number(),
            })
            .strict(),
          z
            .object({
              action: z.literal("delete"),
              regionId: z.string().min(1),
            })
            .strict(),
        ])
        .safeParse(req.body);
      if (!operation.success)
        throw new PapermarkApiError(
          "bad_request",
          "Enter a valid region operation.",
        );
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${jobId}))`;
        const current = await tx.documentRedactionJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });
        if (current?.status !== "REVIEW")
          throw new PapermarkApiError(
            "conflict",
            "This job is no longer editable. Create a new job to continue.",
          );
        if (operation.data.action === "delete") {
          const deleted = await tx.documentRedaction.deleteMany({
            where: { id: operation.data.regionId, jobId },
          });
          if (!deleted.count)
            throw new PapermarkApiError("not_found", "Region not found.");
          return { success: true };
        }
        const { action, ...input } = operation.data;
        const parsed = regionSchema.safeParse(input);
        if (!parsed.success || !numPages || input.pageNumber > numPages)
          throw new PapermarkApiError(
            "bad_request",
            "The region must fit an existing page.",
          );
        if ((await tx.documentRedaction.count({ where: { jobId } })) >= 200)
          throw new PapermarkApiError(
            "bad_request",
            "A job can contain at most 200 regions.",
          );
        return {
          region: await tx.documentRedaction.create({
            data: {
              ...parsed.data,
              jobId,
              source: "MANUAL",
              status: "ACCEPTED",
            },
          }),
        };
      });
      return res.status(200).json(result);
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, PATCH, POST");
      return res.status(405).end();
    }
    if (
      !z
        .object({ action: z.literal("apply") })
        .strict()
        .safeParse(req.body).success
    )
      throw new PapermarkApiError("bad_request", "Choose the apply action.");
    const regions = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${jobId}))`;
      const current = await tx.documentRedactionJob.findUnique({
        where: { id: jobId },
        select: { status: true, redactions: true },
      });
      if (current?.status !== "REVIEW")
        throw new PapermarkApiError(
          "conflict",
          "This job has already started. Refresh its status.",
        );
      if (!current.redactions.length)
        throw new PapermarkApiError(
          "bad_request",
          "Add at least one region before applying.",
        );
      await tx.documentRedactionJob.update({
        where: { id: jobId },
        data: { status: "APPLYING", error: null },
      });
      return current.redactions;
    });
    let candidateId: string | undefined;
    let published = false;
    try {
      const source = await readOwnedPdfVersion({
        teamId,
        documentId,
        documentVersionId: job.documentVersionId,
      });
      const output = await redactToFlattenedPdf(
        source.bytes,
        regions.map(({ pageNumber, x, y, width, height }) => ({
          pageNumber,
          x,
          y,
          width,
          height,
        })),
      );
      const stored = await putFileServer({
        teamId,
        docId: documentId,
        subfolder: `redacted-${jobId}`,
        file: {
          name: "redacted.pdf",
          type: "application/pdf",
          buffer: Buffer.from(output),
        },
      });
      const candidate = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
        const latest = await tx.documentVersion.findFirst({
          where: { documentId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        return tx.documentVersion.create({
          data: {
            documentId,
            versionNumber: (latest?.versionNumber ?? 0) + 1,
            isPrimary: false,
            file: stored.data,
            originalFile: stored.data,
            storageType: stored.type,
            type: "pdf",
            contentType: "application/pdf",
            fileSize: output.byteLength,
          },
        });
      });
      candidateId = candidate.id;
      await renderPdfVersion({
        teamId,
        documentId,
        documentVersionId: candidate.id,
      });
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
        // Do not overwrite a newer version that arrived while this job ran.
        const primary = await tx.documentVersion.findFirst({
          where: { documentId, isPrimary: true },
          select: { id: true },
        });
        if (primary?.id !== job.documentVersionId)
          throw new PapermarkApiError(
            "conflict",
            "The source version changed. Create a new job from the current version.",
          );
        const ready = await tx.documentVersion.findUniqueOrThrow({
          where: { id: candidate.id },
        });
        await tx.documentVersion.updateMany({
          where: { documentId, isPrimary: true },
          data: { isPrimary: false },
        });
        await tx.documentVersion.update({
          where: { id: candidate.id },
          data: { isPrimary: true },
        });
        await tx.document.update({
          where: { id: documentId, teamId },
          data: {
            file: stored.data,
            originalFile: stored.data,
            storageType: stored.type,
            type: "pdf",
            contentType: "application/pdf",
            numPages: ready.numPages,
          },
        });
        await tx.documentRedactionJob.update({
          where: { id: jobId },
          data: { status: "APPLIED", resultVersionId: candidate.id },
        });
        await tx.documentRedaction.updateMany({
          where: { jobId },
          data: { status: "APPLIED" },
        });
      });
      published = true;
      let revalidationPending = false;
      if (process.env.REVALIDATE_TOKEN && process.env.NEXTAUTH_URL) {
        try {
          const url = new URL("/api/revalidate", process.env.NEXTAUTH_URL);
          url.searchParams.set("secret", process.env.REVALIDATE_TOKEN);
          url.searchParams.set("documentId", documentId);
          const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
          });
          revalidationPending = !response.ok;
        } catch {
          revalidationPending = true;
        }
      }
      if (revalidationPending)
        console.warn(
          "Redacted version saved; link revalidation needs a retry.",
        );
      return res
        .status(200)
        .json({ versionId: candidate.id, jobId, revalidationPending });
    } catch (error) {
      if (!published) {
        if (candidateId)
          await prisma.documentVersion.deleteMany({
            where: { id: candidateId, documentId, isPrimary: false },
          });
        await prisma.documentRedactionJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            error:
              "The redacted copy could not be completed. The previous primary version is unchanged; create a new job to retry.",
          },
        });
      }
      throw error;
    }
  } catch (error) {
    return errorhandler(error, res);
  }
}
