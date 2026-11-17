import {
  DefaultPermissionStrategy,
  ItemType,
  Prisma,
  RootItemAccess,
} from "@prisma/client";

import { revalidateLinksForDataroom } from "@/lib/api/links/revalidate";
import { resolveRootItemAccessFlags } from "@/lib/dataroom/root-item-access";
import prisma from "@/lib/prisma";

type AttachedDocument = { id: string; folderId: string | null };
type ScopedGroup = { id: string; dataroomId: string };
type ParentAccess = {
  groupId: string;
  itemId: string;
  itemType: ItemType;
  canView: boolean;
  canDownload: boolean;
};

export type DataroomPermissionDefaultsSnapshot = {
  dataroomId: string;
  requestedDocumentIds: string[];
  documents: (AttachedDocument & { dataroomId: string })[];
  folders: { id: string; dataroomId: string }[];
  viewerGroups: ScopedGroup[];
  permissionGroups: ScopedGroup[];
  viewerParentAccess: ParentAccess[];
  linkParentAccess: (ParentAccess & { canDownloadOriginal: boolean })[];
  groupStrategy: DefaultPermissionStrategy;
  linkStrategy: DefaultPermissionStrategy;
  groupRootItemAccess: RootItemAccess;
  linkRootItemAccess: RootItemAccess;
};

export function buildDataroomDocumentPermissionDefaults(
  snapshot: DataroomPermissionDefaultsSnapshot,
): {
  viewerGroupRows: Prisma.ViewerGroupAccessControlsCreateManyInput[];
  permissionGroupRows: Prisma.PermissionGroupAccessControlsCreateManyInput[];
} {
  const viewerGroupRows: Prisma.ViewerGroupAccessControlsCreateManyInput[] = [];
  const permissionGroupRows: Prisma.PermissionGroupAccessControlsCreateManyInput[] =
    [];
  const requestedIds = new Set(snapshot.requestedDocumentIds);
  if (requestedIds.size === 0) return { viewerGroupRows, permissionGroupRows };

  const assertRoom = (dataroomId: string) => {
    if (dataroomId !== snapshot.dataroomId) {
      throw new Error(
        "Permission defaults cannot use records from another data room",
      );
    }
  };
  snapshot.documents.forEach((document) => assertRoom(document.dataroomId));
  snapshot.folders.forEach((folder) => assertRoom(folder.dataroomId));
  snapshot.viewerGroups.forEach((group) => assertRoom(group.dataroomId));
  snapshot.permissionGroups.forEach((group) => assertRoom(group.dataroomId));

  const documentsById = new Map(
    snapshot.documents.map((document) => [document.id, document]),
  );
  const documents = Array.from(requestedIds, (id) => {
    const document = documentsById.get(id);
    if (!document) throw new Error("Document is unavailable in this data room");
    return document;
  });
  const folderIds = new Set(snapshot.folders.map((folder) => folder.id));
  const parentIds = new Set<string>();
  for (const document of documents) {
    if (document.folderId === null) continue;
    if (!folderIds.has(document.folderId)) {
      throw new Error("Parent folder is unavailable in this data room");
    }
    parentIds.add(document.folderId);
  }

  const validateParentAccess = (
    rows: ParentAccess[],
    groups: ScopedGroup[],
  ) => {
    const groupIds = new Set(groups.map((group) => group.id));
    for (const row of rows) {
      if (
        row.itemType !== ItemType.DATAROOM_FOLDER ||
        !parentIds.has(row.itemId) ||
        !groupIds.has(row.groupId)
      ) {
        throw new Error(
          "Parent permissions are outside this data room or item scope",
        );
      }
    }
  };
  validateParentAccess(snapshot.viewerParentAccess, snapshot.viewerGroups);
  validateParentAccess(snapshot.linkParentAccess, snapshot.permissionGroups);

  // Match the existing folder defaults: ASK/HIDDEN write no grants, and an
  // existing folder with no ACL never falls back to the room-root setting.
  if (
    snapshot.groupStrategy === DefaultPermissionStrategy.INHERIT_FROM_PARENT
  ) {
    const rootFlags = resolveRootItemAccessFlags(snapshot.groupRootItemAccess);
    for (const document of documents) {
      const permissions = document.folderId
        ? snapshot.viewerParentAccess.filter(
            (row) => row.itemId === document.folderId,
          )
        : rootFlags
          ? snapshot.viewerGroups.map((group) => ({
              groupId: group.id,
              ...rootFlags,
            }))
          : [];
      viewerGroupRows.push(
        ...permissions.map((permission) => ({
          groupId: permission.groupId,
          itemId: document.id,
          itemType: ItemType.DATAROOM_DOCUMENT,
          canView: permission.canView,
          canDownload: permission.canDownload,
        })),
      );
    }
  }

  if (snapshot.linkStrategy === DefaultPermissionStrategy.INHERIT_FROM_PARENT) {
    const rootFlags = resolveRootItemAccessFlags(snapshot.linkRootItemAccess);
    for (const document of documents) {
      const permissions = document.folderId
        ? snapshot.linkParentAccess.filter(
            (row) => row.itemId === document.folderId,
          )
        : rootFlags
          ? snapshot.permissionGroups.map((group) => ({
              groupId: group.id,
              ...rootFlags,
              canDownloadOriginal: false,
            }))
          : [];
      permissionGroupRows.push(
        ...permissions.map((permission) => ({
          groupId: permission.groupId,
          itemId: document.id,
          itemType: ItemType.DATAROOM_DOCUMENT,
          canView: permission.canView,
          canDownload: permission.canDownload,
          canDownloadOriginal: permission.canDownloadOriginal,
        })),
      );
    }
  }

  return { viewerGroupRows, permissionGroupRows };
}

export async function applyDataroomDocumentPermissionDefaults({
  dataroomId,
  dataroomDocuments,
  groupStrategy,
  linkStrategy,
  groupRootItemAccess,
  linkRootItemAccess,
}: {
  dataroomId: string;
  dataroomDocuments: AttachedDocument[];
  groupStrategy?: DefaultPermissionStrategy;
  linkStrategy?: DefaultPermissionStrategy;
  groupRootItemAccess?: RootItemAccess;
  linkRootItemAccess?: RootItemAccess;
}): Promise<void> {
  const requestedDocumentIds = Array.from(
    new Set(dataroomDocuments.map((document) => document.id)),
  );
  if (requestedDocumentIds.length === 0) return;

  await prisma.$transaction(
    async (tx) => {
      const [dataroom, documents, viewerGroups, permissionGroups] =
        await Promise.all([
          tx.dataroom.findUnique({
            where: { id: dataroomId },
            select: {
              defaultGroupPermissionStrategy: true,
              defaultPermissionStrategy: true,
              defaultGroupRootItemAccess: true,
              defaultRootItemAccess: true,
            },
          }),
          tx.dataroomDocument.findMany({
            where: { dataroomId, id: { in: requestedDocumentIds } },
            select: { id: true, dataroomId: true, folderId: true },
          }),
          tx.viewerGroup.findMany({
            where: { dataroomId },
            select: { id: true, dataroomId: true },
          }),
          tx.permissionGroup.findMany({
            where: { dataroomId },
            select: { id: true, dataroomId: true },
          }),
        ]);
      if (!dataroom) throw new Error("Data room not found");

      // Callers' folder IDs are hints, not authority. Resolve the persisted
      // documents and their room-scoped parents inside the write transaction.
      const parentIds = Array.from(
        new Set(
          documents
            .map((document) => document.folderId)
            .filter((folderId): folderId is string => folderId !== null),
        ),
      );
      const [folders, viewerParentAccess, linkParentAccess] = await Promise.all(
        [
          tx.dataroomFolder.findMany({
            where: { dataroomId, id: { in: parentIds } },
            select: { id: true, dataroomId: true },
          }),
          tx.viewerGroupAccessControls.findMany({
            where: {
              groupId: { in: viewerGroups.map((group) => group.id) },
              itemId: { in: parentIds },
              itemType: ItemType.DATAROOM_FOLDER,
            },
            select: {
              groupId: true,
              itemId: true,
              itemType: true,
              canView: true,
              canDownload: true,
            },
          }),
          tx.permissionGroupAccessControls.findMany({
            where: {
              groupId: { in: permissionGroups.map((group) => group.id) },
              itemId: { in: parentIds },
              itemType: ItemType.DATAROOM_FOLDER,
            },
            select: {
              groupId: true,
              itemId: true,
              itemType: true,
              canView: true,
              canDownload: true,
              canDownloadOriginal: true,
            },
          }),
        ],
      );

      const plan = buildDataroomDocumentPermissionDefaults({
        dataroomId,
        requestedDocumentIds,
        documents,
        folders,
        viewerGroups,
        permissionGroups,
        viewerParentAccess,
        linkParentAccess,
        groupStrategy: groupStrategy ?? dataroom.defaultGroupPermissionStrategy,
        linkStrategy: linkStrategy ?? dataroom.defaultPermissionStrategy,
        groupRootItemAccess:
          groupRootItemAccess ?? dataroom.defaultGroupRootItemAccess,
        linkRootItemAccess:
          linkRootItemAccess ?? dataroom.defaultRootItemAccess,
      });
      // Defaults only seed new rows. Retrying upload/application must not replace
      // an explicit permission choice made after the item was attached.
      if (plan.viewerGroupRows.length > 0) {
        await tx.viewerGroupAccessControls.createMany({
          data: plan.viewerGroupRows,
          skipDuplicates: true,
        });
      }
      if (plan.permissionGroupRows.length > 0) {
        await tx.permissionGroupAccessControls.createMany({
          data: plan.permissionGroupRows,
          skipDuplicates: true,
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}

export async function onDataroomDocumentsAttached({
  dataroomId,
  dataroomDocuments,
  schedule,
}: {
  dataroomId: string;
  dataroomDocuments: AttachedDocument[];
  schedule?: (promise: Promise<unknown>) => void;
}): Promise<void> {
  if (dataroomDocuments.length === 0) return;
  await applyDataroomDocumentPermissionDefaults({
    dataroomId,
    dataroomDocuments,
  });
  const revalidation = revalidateLinksForDataroom(dataroomId);
  if (schedule) schedule(revalidation);
  else await revalidation;
}
