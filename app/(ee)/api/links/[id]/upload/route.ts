import { NextRequest, NextResponse } from "next/server";

import { RequestListAccessError } from "@/ee/features/request-lists/lib/access-policy";
import { resolveUploadFolder } from "@/ee/features/request-lists/lib/upload-folder";
import { resolveViewerUploadAccess } from "@/ee/features/request-lists/lib/viewer-upload-access";
import { DocumentStorageType, Prisma } from "@prisma/client";
import { runs } from "@trigger.dev/sdk";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

import { processDocument } from "@/lib/api/documents/process-document";
import { verifyDataroomSession } from "@/lib/auth/dataroom-auth";
import prisma from "@/lib/prisma";
import { sendDataroomChangeNotificationTask } from "@/lib/trigger/dataroom-change-notification";
import { sendDataroomUploadNotificationTask } from "@/lib/trigger/dataroom-upload-notification";
import { supportsAdvancedExcelMode } from "@/lib/utils/get-content-type";
import { sanitizePlainText } from "@/lib/utils/sanitize-html";

/**
 * GET /api/links/[id]/upload?dataroomId=xxx
 * Returns the viewer's previously uploaded documents for this dataroom.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const linkId = params.id;
    const dataroomId = request.nextUrl.searchParams.get("dataroomId");

    if (!linkId || !dataroomId) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Verify the dataroom session
    const dataroomSession = await verifyDataroomSession(
      request,
      linkId,
      dataroomId,
    );

    if (!dataroomSession || !dataroomSession.viewerId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { viewerId } = dataroomSession;

    // Fetch the viewer's uploads for this dataroom
    const uploads = await prisma.documentUpload.findMany({
      where: {
        viewerId,
        dataroomId,
        linkId,
      },
      select: {
        id: true,
        documentId: true,
        dataroomDocumentId: true,
        originalFilename: true,
        uploadedAt: true,
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            versions: {
              where: { isPrimary: true },
              select: {
                id: true,
                hasPages: true,
              },
              take: 1,
            },
          },
        },
        dataroomDocument: {
          select: {
            folderId: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    const formattedUploads = uploads.map((upload) => {
      const fileType = upload.document?.type ?? "";
      const hasPages = upload.document?.versions?.[0]?.hasPages ?? false;
      const needsProcessing = ["pdf", "docs", "slides"].includes(fileType);
      const isComplete = !needsProcessing || hasPages;

      return {
        id: upload.id,
        documentId: upload.documentId,
        dataroomDocumentId: upload.dataroomDocumentId,
        documentVersionId: upload.document?.versions?.[0]?.id ?? null,
        name: upload.originalFilename ?? upload.document?.name ?? "Unknown",
        fileType,
        folderId: upload.dataroomDocument?.folderId ?? null,
        uploadedAt: upload.uploadedAt,
        status: isComplete ? "complete" : "processing",
      };
    });

    return NextResponse.json({ uploads: formattedUploads });
  } catch (error) {
    console.error("Error fetching viewer uploads:", error);
    return NextResponse.json(
      { message: "Error fetching uploads" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const linkId = params.id;
    const { documentData, dataroomId, folderId, taskId } = z
      .object({
        dataroomId: z.string().min(1),
        folderId: z.string().min(1).optional(),
        taskId: z.string().min(1).optional(),
        documentData: z.object({
          name: z.string().min(1).max(255),
          key: z.string().min(1),
          storageType: z.literal(DocumentStorageType.S3_PATH),
          contentType: z.string().nullable(),
          supportedFileType: z.string().min(1),
          fileSize: z
            .number()
            .int()
            .min(0)
            .max(2 * 1024 * 1024 * 1024)
            .optional(),
          numPages: z.number().int().nonnegative().optional(),
        }),
      })
      .parse(await request.json());
    const dataroomSession = await verifyDataroomSession(
      request,
      linkId,
      dataroomId,
    );
    const { link, task, viewerId, viewId, teamId } =
      await resolveViewerUploadAccess(
        dataroomSession,
        linkId,
        dataroomId,
        taskId,
      );
    // Viewer binary uploads are stored by TUS inside the owning team's prefix.
    if (
      !documentData.key.startsWith(`${teamId}/`) ||
      documentData.key.split("/").some((part) => part === "..")
    ) {
      throw new RequestListAccessError(
        403,
        "This file does not belong to this room's workspace.",
      );
    }

    if (typeof documentData.name !== "string") {
      return NextResponse.json(
        { message: "Document name is required" },
        { status: 400 },
      );
    }

    const sanitizedDocumentName = sanitizePlainText(documentData.name);
    if (!sanitizedDocumentName) {
      return NextResponse.json(
        { message: "Document name is required" },
        { status: 400 },
      );
    }

    if (sanitizedDocumentName.length > 255) {
      return NextResponse.json(
        { message: "Document name too long" },
        { status: 400 },
      );
    }

    const updatedDocumentData = {
      ...documentData,
      fileSize: documentData.fileSize,
      name: sanitizedDocumentName,
      enableExcelAdvancedMode:
        documentData.supportedFileType === "sheet" &&
        link.team?.enableExcelAdvancedMode &&
        supportsAdvancedExcelMode(documentData.contentType),
    };

    // Resolve the host-controlled destination before creating a document.
    const allowedUploadFolderIds = link.uploadFolderIds.filter(Boolean);
    const folderIds = [
      ...new Set(
        [folderId, task?.uploadFolderId, ...allowedUploadFolderIds].filter(
          (id): id is string => !!id,
        ),
      ),
    ];
    const validFolders = await prisma.dataroomFolder.findMany({
      where: { dataroomId, id: { in: folderIds } },
      select: { id: true },
    });
    const dataroomFolderId = resolveUploadFolder({
      isTaskUpload: !!task,
      taskFolderId: task?.uploadFolderId,
      requestedFolderId: folderId,
      allowedFolderIds: allowedUploadFolderIds,
      validFolderIds: new Set(validFolders.map(({ id }) => id)),
    });
    const document = await processDocument({
      documentData: updatedDocumentData,
      teamId,
      teamPlan: link.team?.plan ?? "free",
      isExternalUpload: true,
    });

    const newDataroomDocument = await prisma.$transaction(
      async (tx) => {
        // Re-check after processing: revoked links, reassignment, completed
        // requests and a frozen room must not accept a late finalization.
        const current = await resolveViewerUploadAccess(
          dataroomSession,
          linkId,
          dataroomId,
          taskId,
          tx,
        );
        const currentFolderIds = [
          ...new Set(
            [
              folderId,
              current.task?.uploadFolderId,
              ...current.link.uploadFolderIds,
            ].filter((id): id is string => !!id),
          ),
        ];
        const currentFolders = await tx.dataroomFolder.findMany({
          where: { dataroomId, id: { in: currentFolderIds } },
          select: { id: true },
        });
        const currentFolderId = resolveUploadFolder({
          isTaskUpload: !!current.task,
          taskFolderId: current.task?.uploadFolderId,
          requestedFolderId: folderId,
          allowedFolderIds: current.link.uploadFolderIds,
          validFolderIds: new Set(currentFolders.map(({ id }) => id)),
        });
        if (currentFolderId !== dataroomFolderId)
          throw new RequestListAccessError(
            409,
            "The upload destination changed. Try again.",
          );
        const roomDocument = await tx.dataroomDocument.create({
          data: {
            dataroomId,
            documentId: document.id,
            folderId: dataroomFolderId,
          },
        });
        await tx.documentUpload.create({
          data: {
            documentId: document.id,
            viewerId,
            viewId,
            linkId,
            originalFilename: document.name,
            fileSize: documentData.fileSize ?? 0,
            numPages: document.numPages,
            mimeType: document.contentType,
            dataroomId,
            dataroomDocumentId: roomDocument.id,
            teamId,
            taskId: current.task?.id,
          },
        });
        if (current.task) {
          await tx.taskActivity.create({
            data: {
              taskId: current.task.id,
              type: "UPLOADED",
              viewerId,
              viewId,
            },
          });
          if (current.task.status !== "SUBMITTED") {
            await tx.task.update({
              where: { id: current.task.id },
              data: { status: "SUBMITTED" },
            });
            await tx.taskActivity.create({
              data: {
                taskId: current.task.id,
                type: "STATUS_CHANGED",
                fromStatus: current.task.status,
                toStatus: "SUBMITTED",
                viewerId,
                viewId,
              },
            });
          }
        }
        return roomDocument;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // 4. Send upload notification to team if enabled
    if (link.enableNotification) {
      try {
        // Cancel any existing pending notification runs for this viewer+dataroom+link
        // Note: runs.list tag filter uses OR logic, so we must post-filter
        // to ensure we only cancel runs matching ALL three tags
        const requiredTags = [
          `dataroom_${dataroomId}`,
          `link_${linkId}`,
          `viewer_${viewerId}`,
        ];
        const allRuns = await runs.list({
          taskIdentifier: ["send-dataroom-upload-notification"],
          tag: requiredTags,
          status: ["DELAYED", "QUEUED"],
          period: "10m",
        });

        const matchingRuns = allRuns.data.filter((run) =>
          requiredTags.every((tag) => run.tags?.includes(tag)),
        );

        await Promise.all(matchingRuns.map((run) => runs.cancel(run.id)));

        // Trigger a new notification with 5-minute delay to batch uploads
        waitUntil(
          sendDataroomUploadNotificationTask.trigger(
            {
              dataroomId,
              linkId,
              viewerId,
              teamId,
            },
            {
              idempotencyKey: `upload-notification-${teamId}-${dataroomId}-${linkId}-${viewerId}-${newDataroomDocument.id}`,
              tags: [
                `team_${teamId}`,
                `dataroom_${dataroomId}`,
                `link_${linkId}`,
                `viewer_${viewerId}`,
              ],
              delay: new Date(Date.now() + 5 * 60 * 1000), // 5 minute delay
            },
          ),
        );
      } catch (error) {
        console.error("Error triggering upload notification:", error);
      }
    }

    // 5. Notify other dataroom visitors about the new upload (each visitor gets their own email)
    //    Uses cancel-and-retrigger as a debounce: cancelled runs' document IDs
    //    are accumulated into the new run so no uploads are lost.
    if (link.dataroom?.enableVisitorUploadChangeNotifications) {
      try {
        const existingChangeRuns = await runs.list({
          taskIdentifier: ["send-dataroom-change-notification"],
          tag: [`dataroom_${dataroomId}`, `visitor_upload_${viewerId}`],
          status: ["DELAYED", "QUEUED"],
          period: "15m",
        });

        const matchingChangeRuns = existingChangeRuns.data.filter(
          (run) =>
            run.tags?.includes(`dataroom_${dataroomId}`) &&
            run.tags?.includes(`visitor_upload_${viewerId}`),
        );

        let accumulatedDocIds: string[] = [newDataroomDocument.id];
        for (const run of matchingChangeRuns) {
          const fullRun = await runs.retrieve(run.id);
          const existingIds = (
            fullRun.payload as { dataroomDocumentIds?: string[] } | undefined
          )?.dataroomDocumentIds;
          if (Array.isArray(existingIds)) {
            accumulatedDocIds.push(...existingIds);
          }
        }
        accumulatedDocIds = [...new Set(accumulatedDocIds)];

        await Promise.all(matchingChangeRuns.map((run) => runs.cancel(run.id)));

        waitUntil(
          sendDataroomChangeNotificationTask.trigger(
            {
              dataroomId,
              dataroomDocumentIds: accumulatedDocIds,
              senderUserId: null,
              teamId,
              excludeViewerId: viewerId,
            },
            {
              idempotencyKey: `visitor-change-notification-${teamId}-${dataroomId}-${viewerId}-${Date.now()}`,
              tags: [
                `team_${teamId}`,
                `dataroom_${dataroomId}`,
                `visitor_upload_${viewerId}`,
              ],
              delay: new Date(Date.now() + 10 * 60 * 1000),
            },
          ),
        );
      } catch (error) {
        console.error(
          "Error triggering visitor upload change notification:",
          error,
        );
      }
    }

    // Return document data for optimistic UI rendering
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        dataroomDocumentId: newDataroomDocument.id,
        documentVersionId: document.versions[0]?.id,
        folderId: dataroomFolderId,
        fileType: document.type,
        hasPages: (document.numPages ?? 0) > 0,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof RequestListAccessError)
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { message: "Invalid upload details." },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return NextResponse.json(
        { message: "This request changed during upload. Try again." },
        { status: 409 },
      );
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { message: "Error uploading document" },
      { status: 500 },
    );
  }
}
