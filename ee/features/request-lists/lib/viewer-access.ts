import type { Prisma } from "@prisma/client";

import type { DataroomSession } from "@/lib/auth/dataroom-auth";
import { resolveRequestListEnabled } from "@/lib/featureFlags/request-list";
import prisma from "@/lib/prisma";

import {
  RequestListAccessError,
  assertRequestLinkAccess,
} from "./access-policy";
import { isViewerAssigned } from "./assignments";

export type RequestDatabase = Pick<
  Prisma.TransactionClient,
  "link" | "viewer" | "taskList" | "task" | "dataroomFolder"
>;

export async function resolveViewerRequestContext(
  session: DataroomSession | null,
  linkId: string,
  dataroomId: string,
  database: RequestDatabase = prisma,
) {
  const link = await database.link.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      dataroomId: true,
      teamId: true,
      isArchived: true,
      deletedAt: true,
      expiresAt: true,
      team: { select: { plan: true } },
      dataroom: {
        select: { teamId: true, requestListEnabled: true, isFrozen: true },
      },
    },
  });
  assertRequestLinkAccess(session, link, linkId, dataroomId);
  if (!link?.teamId || link.dataroom?.teamId !== link.teamId) {
    throw new RequestListAccessError(403, "The request list is not available.");
  }
  if (
    !link.dataroom.requestListEnabled ||
    !(await resolveRequestListEnabled({
      teamId: link.teamId,
      teamPlan: link.team?.plan,
    }))
  ) {
    throw new RequestListAccessError(
      403,
      "Request lists are not enabled for this room.",
      "feature-disabled",
    );
  }
  const viewer = await database.viewer.findFirst({
    where: {
      id: session.viewerId,
      teamId: link.teamId,
      views: {
        some: { id: session.viewId, linkId, dataroomId, isArchived: false },
      },
    },
    select: {
      id: true,
      email: true,
      groups: { where: { group: { dataroomId } }, select: { groupId: true } },
    },
  });
  if (!viewer)
    throw new RequestListAccessError(
      403,
      "This viewer cannot access these requests.",
    );
  const list = await database.taskList.findFirst({
    where: { dataroomId, teamId: link.teamId },
    orderBy: [
      { orderIndex: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: { id: true, name: true },
  });
  return {
    teamId: link.teamId,
    dataroomId,
    viewerId: viewer.id,
    viewId: session.viewId,
    linkId,
    isFrozen: link.dataroom.isFrozen,
    list,
    identity: {
      viewerId: viewer.id,
      email: viewer.email,
      linkId,
      groupIds: new Set(viewer.groups.map(({ groupId }) => groupId)),
    },
  };
}

export type ViewerRequestContext = Awaited<
  ReturnType<typeof resolveViewerRequestContext>
>;

export async function requireAssignedRequestTask(
  context: ViewerRequestContext,
  taskId: string,
  database: RequestDatabase = prisma,
) {
  const task = context.list
    ? await database.task.findFirst({
        where: {
          id: taskId,
          dataroomId: context.dataroomId,
          teamId: context.teamId,
          taskListId: context.list.id,
        },
        include: { assignments: true },
      })
    : null;
  if (!task || !isViewerAssigned(task.assignments, context.identity)) {
    throw new RequestListAccessError(
      403,
      "This request is not assigned to you.",
    );
  }
  return task;
}

export async function requireViewerUploadTask(
  session: DataroomSession | null,
  linkId: string,
  dataroomId: string,
  taskId: string,
  database: RequestDatabase = prisma,
) {
  const context = await resolveViewerRequestContext(
    session,
    linkId,
    dataroomId,
    database,
  );
  if (context.isFrozen)
    throw new RequestListAccessError(403, "This room is closed to changes.");
  const task = await requireAssignedRequestTask(context, taskId, database);
  if (task.type !== "UPLOAD" || task.status === "COMPLETED") {
    throw new RequestListAccessError(
      403,
      "This request is not accepting uploads.",
    );
  }
  if (task.uploadFolderId) {
    const folder = await database.dataroomFolder.findFirst({
      where: { id: task.uploadFolderId, dataroomId },
      select: { id: true },
    });
    if (!folder)
      throw new RequestListAccessError(
        403,
        "The request upload folder is not available.",
      );
  }
  return { context, task };
}
