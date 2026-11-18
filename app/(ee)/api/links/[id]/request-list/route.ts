import { NextRequest, NextResponse } from "next/server";

import {
  RequestListAccessError,
  assertViewerTaskAction,
} from "@/ee/features/request-lists/lib/access-policy";
import { isViewerAssigned } from "@/ee/features/request-lists/lib/assignments";
import {
  requireAssignedRequestTask,
  resolveViewerRequestContext,
} from "@/ee/features/request-lists/lib/viewer-access";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { verifyDataroomSession } from "@/lib/auth/dataroom-auth";
import prisma from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/utils/sanitize-html";

const updateSchema = z
  .object({
    dataroomId: z.string().min(1),
    taskId: z.string().min(1),
    status: z.enum(["IN_PROGRESS", "SUBMITTED"]).optional(),
    comment: z.string().trim().max(4000).optional(),
  })
  .refine(
    ({ status, comment }) => status || comment,
    "Add a comment or choose a status.",
  );

function failure(error: unknown) {
  if (error instanceof RequestListAccessError)
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { message: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { message: "Invalid request details." },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  )
    return NextResponse.json(
      { message: "This request changed. Refresh and try again." },
      { status: 409 },
    );
  console.error("Request list operation failed", error);
  return NextResponse.json(
    { message: "Unable to load or update requests. Please try again." },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dataroomId = request.nextUrl.searchParams.get("dataroomId");
    if (!dataroomId)
      return NextResponse.json(
        { message: "A room is required." },
        { status: 400 },
      );
    const session = await verifyDataroomSession(request, params.id, dataroomId);
    const context = await resolveViewerRequestContext(
      session,
      params.id,
      dataroomId,
    );
    const tasks = context.list
      ? await prisma.task.findMany({
          where: {
            taskListId: context.list.id,
            teamId: context.teamId,
            dataroomId,
          },
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          include: {
            assignments: true,
            activities: {
              where: {
                OR: [{ userId: { not: null } }, { viewerId: context.viewerId }],
              },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
            uploads: {
              where: { viewerId: context.viewerId, linkId: params.id },
              select: {
                id: true,
                originalFilename: true,
                uploadedAt: true,
                document: { select: { name: true } },
              },
            },
          },
        })
      : [];
    return NextResponse.json({
      enabled: true,
      readOnly: context.isFrozen,
      teamId: context.teamId,
      list: context.list,
      tasks: tasks
        .filter((task) => isViewerAssigned(task.assignments, context.identity))
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          status: task.status,
          category: task.category,
          dueDate: task.dueDate?.toISOString() ?? null,
          uploadFolderId: task.uploadFolderId,
          activities: task.activities.map(
            ({
              id,
              type,
              comment,
              fromStatus,
              toStatus,
              createdAt,
              viewerId,
            }) => ({
              id,
              type,
              comment,
              fromStatus,
              toStatus,
              createdAt: createdAt.toISOString(),
              actor: viewerId === context.viewerId ? "You" : "Host",
            }),
          ),
          uploads: task.uploads.map(
            ({ id, originalFilename, uploadedAt, document }) => ({
              id,
              name: originalFilename ?? document.name,
              uploadedAt: uploadedAt.toISOString(),
            }),
          ),
        })),
    });
  } catch (error) {
    if (
      error instanceof RequestListAccessError &&
      error.code === "feature-disabled"
    )
      return NextResponse.json({ enabled: false, list: null, tasks: [] });
    return failure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = updateSchema.parse(await request.json());
    const session = await verifyDataroomSession(
      request,
      params.id,
      body.dataroomId,
    );
    const comment = body.comment
      ? sanitizePlainText(body.comment).trim()
      : undefined;
    if (!body.status && !comment)
      throw new RequestListAccessError(
        400,
        "Add a comment or choose a status.",
      );
    await prisma.$transaction(
      async (tx) => {
        const context = await resolveViewerRequestContext(
          session,
          params.id,
          body.dataroomId,
          tx,
        );
        if (context.isFrozen)
          throw new RequestListAccessError(
            403,
            "This room is closed to changes.",
          );
        const task = await requireAssignedRequestTask(context, body.taskId, tx);
        const hasUpload = !!(await tx.documentUpload.findFirst({
          where: {
            taskId: task.id,
            viewerId: context.viewerId,
            linkId: context.linkId,
            teamId: context.teamId,
          },
          select: { id: true },
        }));
        assertViewerTaskAction(task, body.status, hasUpload);
        if (body.status && body.status !== task.status) {
          await tx.task.update({
            where: { id: task.id },
            data: { status: body.status },
          });
          await tx.taskActivity.create({
            data: {
              taskId: task.id,
              type: "STATUS_CHANGED",
              fromStatus: task.status,
              toStatus: body.status,
              viewerId: context.viewerId,
              viewId: context.viewId,
            },
          });
        }
        if (comment)
          await tx.taskActivity.create({
            data: {
              taskId: task.id,
              type: "COMMENT",
              comment,
              viewerId: context.viewerId,
              viewId: context.viewId,
            },
          });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
