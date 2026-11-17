import type { DataroomSession } from "@/lib/auth/dataroom-auth";
import prisma from "@/lib/prisma";

import {
  RequestListAccessError,
  assertUploadLinkAccess,
} from "./access-policy";
import { type RequestDatabase, requireViewerUploadTask } from "./viewer-access";

export async function resolveViewerUploadAccess(
  session: DataroomSession | null,
  linkId: string,
  dataroomId: string,
  taskId?: string,
  database: RequestDatabase = prisma,
) {
  const link = await database.link.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      name: true,
      teamId: true,
      dataroomId: true,
      isArchived: true,
      deletedAt: true,
      expiresAt: true,
      enableUpload: true,
      enableNotification: true,
      uploadFolderIds: true,
      team: { select: { plan: true, enableExcelAdvancedMode: true } },
      dataroom: {
        select: {
          teamId: true,
          isFrozen: true,
          enableVisitorUploadChangeNotifications: true,
        },
      },
    },
  });
  assertUploadLinkAccess(session, link, linkId, dataroomId);
  if (
    !link?.teamId ||
    link.dataroom?.teamId !== link.teamId ||
    link.dataroom.isFrozen
  )
    throw new RequestListAccessError(
      403,
      "This room is not accepting uploads.",
    );
  const viewer = await database.viewer.findFirst({
    where: {
      id: session.viewerId,
      teamId: link.teamId,
      views: {
        some: { id: session.viewId, linkId, dataroomId, isArchived: false },
      },
    },
    select: { id: true },
  });
  if (!viewer)
    throw new RequestListAccessError(
      403,
      "This viewer cannot upload to this room.",
    );
  // A supplied task must always be authorized, even on a generic-upload link.
  const task = taskId
    ? (
        await requireViewerUploadTask(
          session,
          linkId,
          dataroomId,
          taskId,
          database,
        )
      ).task
    : null;
  if (!task && !link.enableUpload)
    throw new RequestListAccessError(
      403,
      "Uploads are not allowed for this sharing link.",
    );
  return {
    link,
    task,
    viewerId: viewer.id,
    viewId: session.viewId,
    teamId: link.teamId,
  };
}
