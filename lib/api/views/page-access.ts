import { ItemType, type Prisma } from "@prisma/client";

import { canPreviewLink } from "@/lib/auth/preview-access";
import prisma from "@/lib/prisma";
import {
  extractEmailDomain,
  normalizeGroupDomain,
} from "@/lib/utils/email-domain";
import { checkViewerEmailAccess } from "@/lib/utils/global-block-list";

export type PageAccessDatabase = Pick<
  Prisma.TransactionClient,
  | "link"
  | "userTeam"
  | "userDataroom"
  | "dataroomDocument"
  | "viewerGroupAccessControls"
  | "permissionGroupAccessControls"
  | "documentUpload"
>;

/** Recheck current authorization before minting another storage capability. */
export async function canIssuePageUrls(
  input: {
    linkId: string;
    documentId: string;
    documentTeamId: string;
    dataroomId: string | null;
    viewerId?: string | null;
    viewerEmail?: string | null;
    verified?: boolean;
    previewUserId?: string;
  },
  database: PageAccessDatabase = prisma,
): Promise<boolean> {
  const link = await database.link.findUnique({
    where: { id: input.linkId },
    select: {
      teamId: true,
      documentId: true,
      dataroomId: true,
      isArchived: true,
      deletedAt: true,
      expiresAt: true,
      emailProtected: true,
      emailAuthenticated: true,
      allowList: true,
      denyList: true,
      audienceType: true,
      groupId: true,
      permissionGroupId: true,
      team: { select: { globalBlockList: true } },
      dataroom: { select: { teamId: true, isFrozen: true } },
      group: {
        select: {
          allowAll: true,
          domains: true,
          members: { select: { viewer: { select: { email: true } } } },
        },
      },
      visitorGroups: { select: { visitorGroup: { select: { emails: true } } } },
    },
  });
  if (!link?.teamId || link.teamId !== input.documentTeamId || link.deletedAt)
    return false;
  if (!input.previewUserId && link.dataroomId !== input.dataroomId)
    return false;

  let roomDocument: { id: string } | null = null;
  if (link.dataroomId) {
    if (!link.dataroom || link.dataroom.teamId !== link.teamId) return false;
    roomDocument = await database.dataroomDocument.findUnique({
      where: {
        dataroomId_documentId: {
          dataroomId: link.dataroomId,
          documentId: input.documentId,
        },
      },
      select: { id: true },
    });
    if (!roomDocument) return false;
  } else if (link.documentId !== input.documentId) return false;

  // Owners can inspect archived/expired links and closed rooms, but a preview
  // token never preserves membership or a scoped room entitlement after removal.
  if (input.previewUserId) {
    return canPreviewLink(input.linkId, input.previewUserId, database);
  }

  if (
    link.isArchived ||
    (link.expiresAt && link.expiresAt.getTime() <= Date.now()) ||
    link.dataroom?.isFrozen ||
    (link.emailAuthenticated && !input.verified) ||
    (link.emailProtected && !input.viewerEmail)
  )
    return false;

  const group =
    link.audienceType === "GROUP" && link.groupId ? link.group : null;
  if (link.audienceType === "GROUP" && (!link.groupId || !group)) return false;
  const groupEmails =
    group && !group.allowAll
      ? [...group.members.map(({ viewer }) => viewer.email), ...group.domains]
      : [];
  if (
    checkViewerEmailAccess({
      email: input.viewerEmail ?? undefined,
      allowList: [
        ...link.allowList,
        ...link.visitorGroups.flatMap(
          ({ visitorGroup }) => visitorGroup.emails,
        ),
        ...groupEmails,
      ],
      denyList: link.denyList,
      globalBlockList: link.team?.globalBlockList,
    }).denied
  )
    return false;
  if (group && !group.allowAll) {
    const domain = extractEmailDomain(input.viewerEmail ?? "");
    if (
      !group.members.some(({ viewer }) => viewer.email === input.viewerEmail) &&
      !group.domains.some(
        (entry) => domain && normalizeGroupDomain(entry) === domain,
      )
    )
      return false;
  }

  if (!roomDocument || (!link.groupId && !link.permissionGroupId)) return true;
  const permission = link.groupId
    ? await database.viewerGroupAccessControls.findUnique({
        where: {
          groupId_itemId: { groupId: link.groupId, itemId: roomDocument.id },
          itemType: ItemType.DATAROOM_DOCUMENT,
        },
        select: { canView: true, canDownload: true },
      })
    : await database.permissionGroupAccessControls.findUnique({
        where: {
          groupId_itemId: {
            groupId: link.permissionGroupId!,
            itemId: roomDocument.id,
          },
          itemType: ItemType.DATAROOM_DOCUMENT,
        },
        select: { canView: true, canDownload: true },
      });
  if (permission?.canView || permission?.canDownload) return true;
  // Preserve the existing verified uploader exception, bound to this link and
  // actual room-document row rather than a caller-supplied viewer identity.
  if (!input.verified || !input.viewerId) return false;
  return !!(await database.documentUpload.findFirst({
    where: {
      linkId: input.linkId,
      dataroomDocumentId: roomDocument.id,
      viewerId: input.viewerId,
    },
    select: { id: true },
  }));
}
