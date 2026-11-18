import {
  DefaultPermissionStrategy,
  ItemType,
  RootItemAccess,
} from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";

import {
  type DataroomPermissionDefaultsSnapshot,
  buildDataroomDocumentPermissionDefaults,
} from "./apply-default-permissions";

function snapshot(): DataroomPermissionDefaultsSnapshot {
  return {
    dataroomId: "room",
    requestedDocumentIds: ["document"],
    documents: [{ id: "document", dataroomId: "room", folderId: null }],
    folders: [],
    viewerGroups: [{ id: "viewers", dataroomId: "room" }],
    permissionGroups: [{ id: "links", dataroomId: "room" }],
    viewerParentAccess: [],
    linkParentAccess: [],
    groupStrategy: DefaultPermissionStrategy.INHERIT_FROM_PARENT,
    linkStrategy: DefaultPermissionStrategy.INHERIT_FROM_PARENT,
    groupRootItemAccess: RootItemAccess.VIEW_ONLY,
    linkRootItemAccess: RootItemAccess.VIEW_ONLY,
  };
}

test("root defaults distinguish view, download and hidden without original-file grants", () => {
  for (const access of Object.values(RootItemAccess)) {
    const input = snapshot();
    input.groupRootItemAccess = access;
    input.linkRootItemAccess = access;
    const plan = buildDataroomDocumentPermissionDefaults(input);
    if (access === RootItemAccess.HIDDEN) {
      assert.deepEqual(plan, { viewerGroupRows: [], permissionGroupRows: [] });
      continue;
    }
    assert.deepEqual(plan.viewerGroupRows, [
      {
        groupId: "viewers",
        itemId: "document",
        itemType: ItemType.DATAROOM_DOCUMENT,
        canView: true,
        canDownload: access === RootItemAccess.VIEW_AND_DOWNLOAD,
      },
    ]);
    assert.deepEqual(plan.permissionGroupRows, [
      {
        groupId: "links",
        itemId: "document",
        itemType: ItemType.DATAROOM_DOCUMENT,
        canView: true,
        canDownload: access === RootItemAccess.VIEW_AND_DOWNLOAD,
        canDownloadOriginal: false,
      },
    ]);
  }
});

test("viewer and link strategies are independent; ask and hidden never create grants", () => {
  for (const strategy of [
    DefaultPermissionStrategy.ASK_EVERY_TIME,
    DefaultPermissionStrategy.HIDDEN_BY_DEFAULT,
  ]) {
    const input = snapshot();
    input.groupRootItemAccess = RootItemAccess.VIEW_AND_DOWNLOAD;
    input.linkRootItemAccess = RootItemAccess.VIEW_AND_DOWNLOAD;
    input.groupStrategy = strategy;
    let plan = buildDataroomDocumentPermissionDefaults(input);
    assert.equal(plan.viewerGroupRows.length, 0);
    assert.equal(plan.permissionGroupRows.length, 1);
    input.groupStrategy = DefaultPermissionStrategy.INHERIT_FROM_PARENT;
    input.linkStrategy = strategy;
    plan = buildDataroomDocumentPermissionDefaults(input);
    assert.equal(plan.viewerGroupRows.length, 1);
    assert.equal(plan.permissionGroupRows.length, 0);
    input.groupStrategy = strategy;
    assert.deepEqual(buildDataroomDocumentPermissionDefaults(input), {
      viewerGroupRows: [],
      permissionGroupRows: [],
    });
  }
});

test("a persisted parent supplies exact ACL flags including original-file permission", () => {
  const input = snapshot();
  input.documents[0].folderId = "folder";
  input.folders = [{ id: "folder", dataroomId: "room" }];
  input.viewerParentAccess = [
    {
      groupId: "viewers",
      itemId: "folder",
      itemType: ItemType.DATAROOM_FOLDER,
      canView: false,
      canDownload: false,
    },
  ];
  input.linkParentAccess = [
    {
      groupId: "links",
      itemId: "folder",
      itemType: ItemType.DATAROOM_FOLDER,
      canView: true,
      canDownload: false,
      canDownloadOriginal: true,
    },
  ];
  const plan = buildDataroomDocumentPermissionDefaults(input);
  assert.equal(plan.viewerGroupRows[0].canView, false);
  assert.equal(plan.viewerGroupRows[0].canDownload, false);
  assert.equal(plan.permissionGroupRows[0].canDownload, false);
  assert.equal(plan.permissionGroupRows[0].canDownloadOriginal, true);
  assert.equal(plan.permissionGroupRows[0].itemId, "document");
  assert.equal(
    plan.permissionGroupRows[0].itemType,
    ItemType.DATAROOM_DOCUMENT,
  );
});

test("a parent without ACL rows never falls back to permissive room-root defaults", () => {
  const input = snapshot();
  input.documents[0].folderId = "folder";
  input.folders = [{ id: "folder", dataroomId: "room" }];
  input.groupRootItemAccess = RootItemAccess.VIEW_AND_DOWNLOAD;
  input.linkRootItemAccess = RootItemAccess.VIEW_AND_DOWNLOAD;
  assert.deepEqual(buildDataroomDocumentPermissionDefaults(input), {
    viewerGroupRows: [],
    permissionGroupRows: [],
  });
});

test("wrong-room records and unavailable documents or parents cannot produce ACL rows", () => {
  for (const field of [
    "documents",
    "folders",
    "viewerGroups",
    "permissionGroups",
  ] as const) {
    const input = snapshot();
    if (field === "folders")
      input.folders = [{ id: "folder", dataroomId: "other-room" }];
    else input[field][0].dataroomId = "other-room";
    assert.throws(
      () => buildDataroomDocumentPermissionDefaults(input),
      /another data room/,
    );
  }
  const missingDocument = snapshot();
  missingDocument.requestedDocumentIds.push("unavailable-document");
  assert.throws(
    () => buildDataroomDocumentPermissionDefaults(missingDocument),
    /Document is unavailable/,
  );
  const missingParent = snapshot();
  missingParent.documents[0].folderId = "other-room-parent";
  assert.throws(
    () => buildDataroomDocumentPermissionDefaults(missingParent),
    /Parent folder is unavailable/,
  );
});

test("ACL rows from an unrelated group, another parent, or another item type are rejected", () => {
  for (const invalid of [
    { groupId: "other-room-group" },
    { itemId: "unrelated-folder" },
    { itemType: ItemType.DATAROOM_DOCUMENT },
  ]) {
    const input = snapshot();
    input.documents[0].folderId = "folder";
    input.folders = [{ id: "folder", dataroomId: "room" }];
    input.linkParentAccess = [
      {
        groupId: "links",
        itemId: "folder",
        itemType: ItemType.DATAROOM_FOLDER,
        canView: true,
        canDownload: true,
        canDownloadOriginal: true,
        ...invalid,
      },
    ];
    assert.throws(
      () => buildDataroomDocumentPermissionDefaults(input),
      /outside this data room or item scope/,
    );
  }
});

test("only requested persisted items are seeded and retries cannot duplicate the plan", () => {
  const input = snapshot();
  input.documents.push({
    id: "unrequested-document",
    dataroomId: "room",
    folderId: null,
  });
  input.requestedDocumentIds.push("document");
  const plan = buildDataroomDocumentPermissionDefaults(input);
  assert.deepEqual(
    plan.viewerGroupRows.map((row) => row.itemId),
    ["document"],
  );
  assert.deepEqual(
    plan.permissionGroupRows.map((row) => row.itemId),
    ["document"],
  );
});
