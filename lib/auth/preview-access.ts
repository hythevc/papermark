import type { Prisma } from "@prisma/client";

import { canAccessDataroom } from "@/lib/api/rbac/entitlements";
import {
  hasAllPermissions,
  isDataroomScopedRole,
} from "@/lib/api/rbac/permissions";
import prisma from "@/lib/prisma";

export type PreviewAccessDatabase = Pick<
  Prisma.TransactionClient,
  "link" | "userTeam" | "userDataroom" | "dataroomDocument"
>;

/** A preview token binds identity; current workspace access is always separate. */
export async function canPreviewLink(
  linkId: string,
  userId: string,
  database: PreviewAccessDatabase = prisma,
): Promise<boolean> {
  const link = await database.link.findUnique({
    where: { id: linkId },
    select: {
      teamId: true,
      deletedAt: true,
      documentId: true,
      dataroomId: true,
      document: { select: { teamId: true } },
      dataroom: { select: { teamId: true } },
    },
  });
  if (!link?.teamId || link.deletedAt) return false;
  if (link.dataroomId) {
    if (link.dataroom?.teamId !== link.teamId) return false;
  } else if (!link.documentId || link.document?.teamId !== link.teamId)
    return false;
  const membership = await database.userTeam.findUnique({
    where: { userId_teamId: { userId, teamId: link.teamId } },
    select: { role: true, status: true, blockedAt: true },
  });
  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.blockedAt ||
    !hasAllPermissions(membership.role, ["links.read"])
  )
    return false;
  if (!isDataroomScopedRole(membership.role)) return true;
  const assignments = await database.userDataroom.findMany({
    where: { userId, teamId: link.teamId },
    select: { dataroomId: true },
  });
  const allowedIds = assignments.map(({ dataroomId }) => dataroomId);
  if (link.dataroomId)
    return canAccessDataroom(membership.role, allowedIds, link.dataroomId);
  return !!(await database.dataroomDocument.findFirst({
    where: { documentId: link.documentId!, dataroomId: { in: allowedIds } },
    select: { id: true },
  }));
}
