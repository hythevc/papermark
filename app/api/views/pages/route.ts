import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { z } from "zod";

import { canIssuePageUrls } from "@/lib/api/views/page-access";
import { authOptions } from "@/lib/auth/auth-options";
import { verifyDataroomSession } from "@/lib/auth/dataroom-auth";
import { verifyLinkSession } from "@/lib/auth/link-session";
import { verifyPreviewSession } from "@/lib/auth/preview-auth";
import { getFile } from "@/lib/files/get-file";
import { signPageLinks } from "@/lib/files/sign-page-links";
import prisma from "@/lib/prisma";
import { ratelimit } from "@/lib/redis";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

const MAX_PAGES_PER_REQUEST = 15;
const VIEW_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours

const viewRequestSchema = z.object({
  viewId: z.string().cuid(),
  documentVersionId: z.string().cuid(),
  pageNumbers: z
    .array(z.number().int().positive())
    .min(1)
    .max(MAX_PAGES_PER_REQUEST),
});

const previewRequestSchema = z.object({
  previewToken: z.string().min(1),
  linkId: z.string().min(1),
  documentVersionId: z.string().cuid(),
  pageNumbers: z
    .array(z.number().int().positive())
    .min(1)
    .max(MAX_PAGES_PER_REQUEST),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const viewParsed = viewRequestSchema.safeParse(body);
    const previewParsed = previewRequestSchema.safeParse(body);

    if (!viewParsed.success && !previewParsed.success) {
      return NextResponse.json(
        { message: "Invalid request." },
        { status: 400 },
      );
    }

    const { documentVersionId, pageNumbers } = viewParsed.success
      ? viewParsed.data
      : previewParsed.data!;

    if (previewParsed.success && !viewParsed.success) {
      const { previewToken, linkId } = previewParsed.data;

      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
      }
      const userId = (session.user as CustomUser).id;

      const rateLimitResult = await ratelimit(60, "1 m").limit(
        `preview-pages:${linkId}`,
      );
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { message: "Too many requests. Please try again later." },
          { status: 429 },
        );
      }

      const previewSession = await verifyPreviewSession(
        previewToken,
        userId,
        linkId,
      );
      if (!previewSession) {
        return NextResponse.json(
          { message: "Invalid or expired preview session." },
          { status: 401 },
        );
      }

      const documentVersion = await prisma.documentVersion.findUnique({
        where: { id: documentVersionId },
        select: { documentId: true, document: { select: { teamId: true } } },
      });
      if (!documentVersion) {
        return NextResponse.json(
          { message: "Document version not found." },
          { status: 404 },
        );
      }
      if (
        !(await canIssuePageUrls({
          linkId,
          documentId: documentVersion.documentId,
          documentTeamId: documentVersion.document.teamId,
          dataroomId: null,
          previewUserId: userId,
        }))
      ) {
        return NextResponse.json(
          { message: "Unauthorized access." },
          { status: 403 },
        );
      }

      return await fetchAndReturnPages(documentVersionId, pageNumbers, true);
    }

    // Standard view-based auth path
    const { viewId } = viewParsed.data!;

    const [rateLimitResult, view, documentVersion] = await Promise.all([
      ratelimit(60, "1 m").limit(`view-pages:${viewId}`),
      prisma.view.findUnique({
        where: { id: viewId },
        select: {
          id: true,
          documentId: true,
          dataroomId: true,
          dataroomViewId: true,
          linkId: true,
          viewedAt: true,
          viewerId: true,
          viewerEmail: true,
          verified: true,
          isArchived: true,
        },
      }),
      prisma.documentVersion.findUnique({
        where: { id: documentVersionId, isPrimary: true },
        select: { documentId: true, document: { select: { teamId: true } } },
      }),
    ]);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    if (!view) {
      return NextResponse.json({ message: "View not found." }, { status: 404 });
    }

    if (
      view.isArchived ||
      Date.now() - view.viewedAt.getTime() > VIEW_MAX_AGE_MS
    ) {
      return NextResponse.json(
        { message: "View session expired." },
        { status: 401 },
      );
    }

    if (!documentVersion || documentVersion.documentId !== view.documentId) {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 403 },
      );
    }

    if (!view.linkId) {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 403 },
      );
    }
    let verified = false;
    if (view.dataroomId) {
      const session = await verifyDataroomSession(
        request,
        view.linkId,
        view.dataroomId,
      );
      if (!session) {
        return NextResponse.json(
          { message: "Invalid or expired session." },
          { status: 401 },
        );
      }

      verified = session.verified && view.verified;

      // A DOCUMENT_VIEW's `dataroomViewId` points to the session's
      // DATAROOM_VIEW (`session.viewId`); viewer-id match is a legacy fallback.
      const belongsToSessionView =
        session.viewId === view.id ||
        (!!view.dataroomViewId && view.dataroomViewId === session.viewId);
      const sameViewer =
        !!session.viewerId &&
        !!view.viewerId &&
        session.viewerId === view.viewerId;
      if (!belongsToSessionView && !sameViewer) {
        return NextResponse.json(
          { message: "Unauthorized access." },
          { status: 403 },
        );
      }
    } else {
      const session = await verifyLinkSession(request, view.linkId);
      if (
        !session ||
        session.viewId !== view.id ||
        session.documentId !== view.documentId
      ) {
        return NextResponse.json(
          { message: "Invalid or expired session." },
          { status: 401 },
        );
      }
      verified = session.verified && view.verified;
    }

    if (
      !(await canIssuePageUrls({
        linkId: view.linkId,
        documentId: documentVersion.documentId,
        documentTeamId: documentVersion.document.teamId,
        dataroomId: view.dataroomId,
        viewerId: view.viewerId,
        viewerEmail: view.viewerEmail,
        verified,
      }))
    ) {
      return NextResponse.json(
        { message: "Unauthorized access." },
        { status: 403 },
      );
    }
    return await fetchAndReturnPages(documentVersionId, pageNumbers);
  } catch (error) {
    log({
      message: `Failed to fetch page URLs. \n\n ${error}`,
      type: "error",
    });
    return NextResponse.json(
      { message: "Unable to load document pages." },
      { status: 500 },
    );
  }
}

async function fetchAndReturnPages(
  documentVersionId: string,
  pageNumbers: number[],
  verifiedOwnerPreview = false,
) {
  const documentPages = await prisma.documentPage.findMany({
    where: {
      versionId: documentVersionId,
      ...(!verifiedOwnerPreview && { version: { isPrimary: true } }),
      pageNumber: { in: pageNumbers },
    },
    select: {
      file: true,
      storageType: true,
      pageNumber: true,
      pageLinks: true,
    },
  });

  const pagesWithUrls = await Promise.all(
    documentPages.map(async (page) => {
      const { storageType, pageLinks } = page;
      // Re-sign overlay URLs alongside the page-image URL — they share the
      // same TTL and the viewer needs both refreshed when it lazy-loads a
      // page outside the initial window.
      const signedLinks = await signPageLinks(pageLinks);
      return {
        pageNumber: page.pageNumber,
        file: await getFile({ data: page.file, type: storageType }),
        ...(signedLinks ? { pageLinks: signedLinks } : {}),
      };
    }),
  );

  return NextResponse.json(
    { pages: pagesWithUrls },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
