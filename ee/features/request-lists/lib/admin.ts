import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { PagesRouterTeamContext } from "@/lib/api/auth/with-session-team";
import { resolveRequestListEnabled } from "@/lib/featureFlags/request-list";
import prisma from "@/lib/prisma";

import {
  RequestListAdminError,
  assignmentChanges,
  validateTaskTargets,
} from "./admin-validation";
import {
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
} from "./schemas";

const taskInclude = {
  assignments: {
    select: {
      id: true,
      viewerId: true,
      groupId: true,
      linkId: true,
      email: true,
    },
    orderBy: { createdAt: "asc" },
  },
  activities: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      type: true,
      comment: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      viewer: { select: { id: true, email: true } },
    },
  },
  uploads: {
    orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      documentId: true,
      dataroomDocumentId: true,
      originalFilename: true,
      fileSize: true,
      mimeType: true,
      uploadedAt: true,
      document: { select: { id: true, name: true, type: true } },
    },
  },
} satisfies Prisma.TaskInclude;

type AdminTaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function serializeAdminTask(task: AdminTaskRecord) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    category: task.category,
    dueDate: task.dueDate?.toISOString() ?? null,
    orderIndex: task.orderIndex,
    uploadFolderId: task.uploadFolderId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignments: task.assignments,
    activities: task.activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    })),
    uploads: task.uploads.map((upload) => ({
      ...upload,
      fileSize: upload.fileSize?.toString() ?? null,
      uploadedAt: upload.uploadedAt.toISOString(),
    })),
  };
}

export type AdminRequestTask = ReturnType<typeof serializeAdminTask>;
export type AdminRequestListResponse = {
  list: { id: string; name: string; orderIndex: number | null } | null;
  tasks: AdminRequestTask[];
  canWrite: boolean;
  requestListEnabled: boolean;
};

const listOrder = [
  { orderIndex: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.TaskListOrderByWithRelationInput[];

async function getRoom(
  database: Pick<Prisma.TransactionClient, "dataroom">,
  scope: { teamId: string; dataroomId: string },
  mutation: boolean,
) {
  const room = await database.dataroom.findFirst({
    where: { id: scope.dataroomId, teamId: scope.teamId },
    select: { id: true, isFrozen: true, requestListEnabled: true },
  });
  if (!room) throw new RequestListAdminError(404, "Data room not found.");
  if (mutation && room.isFrozen) {
    throw new RequestListAdminError(
      403,
      "This data room is frozen. Unfreeze it before changing requests.",
    );
  }
  return room;
}

async function transaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  // The default-list read and creation must serialize: the schema permits many
  // lists and has no unique "default" column. Retry a concurrent transaction
  // conflict rather than creating two default lists or losing an assignment.
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
}

export async function handleAdminRequestList(context: PagesRouterTeamContext) {
  const { req, res, teamId, team, userId, permissions } = context;
  const dataroomId = typeof req.query.id === "string" ? req.query.id : null;
  if (!dataroomId)
    return res.status(400).json({ error: "Choose a data room." });
  const scope = { teamId, dataroomId };

  try {
    const room = await getRoom(prisma, scope, req.method !== "GET");
    if (!(await resolveRequestListEnabled({ teamId, teamPlan: team.plan }))) {
      throw new RequestListAdminError(
        403,
        "Request lists are not available for this workspace.",
      );
    }

    if (req.method === "GET") {
      const list = await prisma.taskList.findFirst({
        where: scope,
        orderBy: listOrder,
        select: { id: true, name: true, orderIndex: true },
      });
      const tasks = list
        ? await prisma.task.findMany({
            where: { ...scope, taskListId: list.id },
            orderBy: [
              { orderIndex: { sort: "asc", nulls: "last" } },
              { createdAt: "asc" },
              { id: "asc" },
            ],
            include: taskInclude,
          })
        : [];
      const result: AdminRequestListResponse = {
        list,
        tasks: tasks.map(serializeAdminTask),
        canWrite: permissions.has("datarooms.write") && !room.isFrozen,
        requestListEnabled: room.requestListEnabled,
      };
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const input = createTaskSchema.parse(req.body);
      const task = await transaction(async (tx) => {
        await getRoom(tx, scope, true);
        await validateTaskTargets(tx, scope, input);
        let list = await tx.taskList.findFirst({
          where: scope,
          orderBy: listOrder,
        });
        if (!list) {
          list = await tx.taskList.create({
            data: { ...scope, name: "Request list", orderIndex: 0 },
          });
        }
        const lastTask = await tx.task.findFirst({
          where: { ...scope, taskListId: list.id },
          orderBy: { orderIndex: { sort: "desc", nulls: "last" } },
          select: { orderIndex: true },
        });
        const { assignments = [], dueDate, ...fields } = input;
        return tx.task.create({
          data: {
            ...fields,
            ...scope,
            dueDate: dueDate ? new Date(dueDate) : null,
            taskListId: list.id,
            createdByUserId: userId,
            orderIndex: (lastTask?.orderIndex ?? -1) + 1,
            assignments: { create: assignments },
            activities: {
              create: [
                { type: "CREATED", userId },
                ...(assignments.length ? [{ type: "ASSIGNED", userId }] : []),
              ],
            },
          },
          include: taskInclude,
        });
      });
      return res.status(201).json({ task: serializeAdminTask(task) });
    }

    if (req.method === "PATCH") {
      const input = updateTaskSchema.parse(req.body);
      const task = await transaction(async (tx) => {
        await getRoom(tx, scope, true);
        const existing = await tx.task.findFirst({
          where: { id: input.taskId, ...scope, taskList: scope },
          include: { assignments: true },
        });
        if (!existing)
          throw new RequestListAdminError(404, "Request not found.");
        const nextType = input.type ?? existing.type;
        if (input.uploadFolderId && nextType !== "UPLOAD") {
          throw new RequestListAdminError(
            400,
            "Only upload requests can have a destination folder.",
          );
        }
        await validateTaskTargets(tx, scope, input);
        const { taskId, assignments, dueDate, ...fields } = input;
        const assignmentDelta =
          assignments === undefined
            ? null
            : assignmentChanges(existing.assignments, assignments);
        const activities: Prisma.TaskActivityCreateWithoutTaskInput[] = [];
        if (input.status && input.status !== existing.status) {
          activities.push({
            type: "STATUS_CHANGED",
            fromStatus: existing.status,
            toStatus: input.status,
            user: { connect: { id: userId } },
          });
        }
        if (
          assignmentDelta &&
          (assignmentDelta.removedIds.length ||
            assignmentDelta.additions.length)
        ) {
          if (assignmentDelta.removedIds.length) {
            await tx.taskAssignment.deleteMany({
              where: { taskId, id: { in: assignmentDelta.removedIds } },
            });
          }
          activities.push({
            type: "ASSIGNED",
            user: { connect: { id: userId } },
          });
        }
        return tx.task.update({
          where: { id: taskId, ...scope },
          data: {
            ...fields,
            ...(dueDate !== undefined && {
              dueDate: dueDate ? new Date(dueDate) : null,
            }),
            ...(nextType !== "UPLOAD" && { uploadFolderId: null }),
            ...(assignmentDelta?.additions.length && {
              assignments: { create: assignmentDelta.additions },
            }),
            ...(activities.length > 0 && {
              activities: { create: activities },
            }),
          },
          include: taskInclude,
        });
      });
      return res.status(200).json({ task: serializeAdminTask(task) });
    }

    if (req.method === "DELETE") {
      const { taskId } = deleteTaskSchema.parse(req.body);
      await transaction(async (tx) => {
        await getRoom(tx, scope, true);
        const deleted = await tx.task.deleteMany({
          where: { id: taskId, ...scope, taskList: scope },
        });
        if (!deleted.count)
          throw new RequestListAdminError(404, "Request not found.");
      });
      return res.status(204).end();
    }
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    if (error instanceof RequestListAdminError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({
          error: error.issues[0]?.message ?? "Check the request details.",
        });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      return res
        .status(409)
        .json({
          error:
            "This request changed while you were editing. Refresh and try again.",
        });
    }
    console.error("Request list operation failed", error);
    return res
      .status(500)
      .json({ error: "Unable to update the request list. Try again." });
  }
}
