import assert from "node:assert/strict";
import test from "node:test";

import type { DataroomSession } from "@/lib/auth/dataroom-auth";

import { RequestListAccessError } from "./access-policy";
import type { RequestDatabase } from "./viewer-access";
import { resolveViewerUploadAccess } from "./viewer-upload-access";

const session = {
  linkId: "link-a",
  dataroomId: "room-a",
  viewId: "view-a",
  viewerId: "viewer-a",
  verified: true,
  expiresAt: Date.now() + 60_000,
} as DataroomSession;
const activeLink = {
  id: "link-a",
  name: null,
  dataroomId: "room-a",
  teamId: "team-a",
  isArchived: false,
  deletedAt: null,
  expiresAt: null,
  enableUpload: false,
  enableNotification: false,
  uploadFolderIds: [],
  team: { plan: "datarooms-plus", enableExcelAdvancedMode: false },
  dataroom: {
    teamId: "team-a",
    requestListEnabled: true,
    isFrozen: false,
    enableVisitorUploadChangeNotifications: false,
  },
};
const uploadTask = {
  id: "task-a",
  type: "UPLOAD",
  status: "OPEN",
  uploadFolderId: "folder-a",
  assignments: [{ viewerId: "viewer-a" }],
};

function database(
  options: {
    link?: Omit<Partial<typeof activeLink>, "expiresAt" | "deletedAt"> & {
      expiresAt?: Date | null;
      deletedAt?: Date | null;
    };
    task?: Partial<typeof uploadTask> | null;
    viewerExists?: boolean;
    folderExists?: boolean;
  } = {},
) {
  const db = {
    link: { findUnique: async () => ({ ...activeLink, ...options.link }) },
    viewer: {
      findFirst: async ({
        where,
      }: {
        where: {
          id: string;
          teamId: string;
          views: {
            some: {
              id: string;
              linkId: string;
              dataroomId: string;
              isArchived: boolean;
            };
          };
        };
      }) => {
        assert.deepEqual(where, {
          id: "viewer-a",
          teamId: "team-a",
          views: {
            some: {
              id: "view-a",
              linkId: "link-a",
              dataroomId: "room-a",
              isArchived: false,
            },
          },
        });
        return options.viewerExists === false
          ? null
          : { id: "viewer-a", email: "viewer@example.com", groups: [] };
      },
    },
    taskList: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { dataroomId: "room-a", teamId: "team-a" });
        return { id: "list-a", name: "Requests" };
      },
    },
    task: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          id: "task-a",
          dataroomId: "room-a",
          teamId: "team-a",
          taskListId: "list-a",
        });
        return options.task === null
          ? null
          : { ...uploadTask, ...options.task };
      },
    },
    dataroomFolder: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { id: "folder-a", dataroomId: "room-a" });
        return options.folderExists === false ? null : { id: "folder-a" };
      },
    },
  };
  return db as unknown as RequestDatabase;
}

const denied = (error: unknown) =>
  error instanceof RequestListAccessError && error.status === 403;

test("an assigned upload request authorizes its verified visitor without generic uploads", async () => {
  const result = await resolveViewerUploadAccess(
    session,
    "link-a",
    "room-a",
    "task-a",
    database(),
  );
  assert.equal(result.teamId, "team-a");
  assert.equal(result.task?.id, "task-a");
  await assert.rejects(
    () =>
      resolveViewerUploadAccess(
        session,
        "link-a",
        "room-a",
        undefined,
        database(),
      ),
    denied,
  );
});

test("generic upload permission does not bypass a supplied task's assignment", async () => {
  await assert.rejects(
    () =>
      resolveViewerUploadAccess(
        session,
        "link-a",
        "room-a",
        "task-a",
        database({
          link: { enableUpload: true },
          task: { assignments: [{ viewerId: "other" }] },
        }),
      ),
    denied,
  );
  const result = await resolveViewerUploadAccess(
    session,
    "link-a",
    "room-a",
    undefined,
    database({ link: { enableUpload: true } }),
  );
  assert.equal(result.task, null);
});

test("cross-room/missing task, missing viewer, completed task, frozen room and missing target fail", async () => {
  for (const options of [
    { task: null },
    { viewerExists: false },
    { task: { status: "COMPLETED" } },
    { task: { type: "TODO" } },
    { folderExists: false },
    { link: { dataroom: { ...activeLink.dataroom, isFrozen: true } } },
    { link: { dataroomId: "other" } },
  ]) {
    await assert.rejects(
      () =>
        resolveViewerUploadAccess(
          session,
          "link-a",
          "room-a",
          "task-a",
          database(options),
        ),
      denied,
    );
  }
});

test("revocation or expiry takes effect even while the visitor session remains valid", async () => {
  for (const link of [
    { isArchived: true },
    { deletedAt: new Date() },
    { expiresAt: new Date(Date.now() - 1000) },
  ]) {
    await assert.rejects(
      () =>
        resolveViewerUploadAccess(
          session,
          "link-a",
          "room-a",
          "task-a",
          database({ link }),
        ),
      denied,
    );
  }
});
