import assert from "node:assert/strict";
import test from "node:test";

import { type PageAccessDatabase, canIssuePageUrls } from "./page-access";

function fixture() {
  const link = {
    teamId: "team",
    documentId: null as string | null,
    dataroomId: "room" as string | null,
    isArchived: false,
    deletedAt: null as Date | null,
    expiresAt: null as Date | null,
    emailProtected: true,
    emailAuthenticated: true,
    allowList: ["guest@example.com"],
    denyList: [] as string[],
    audienceType: "GENERAL",
    groupId: null as string | null,
    permissionGroupId: null as string | null,
    team: { globalBlockList: [] as string[] },
    dataroom: { teamId: "team", isFrozen: false },
    group: null as null | {
      allowAll: boolean;
      domains: string[];
      members: { viewer: { email: string } }[];
    },
    visitorGroups: [] as { visitorGroup: { emails: string[] } }[],
  };
  const state = {
    link,
    attached: true,
    permission: { canView: true, canDownload: false } as {
      canView: boolean;
      canDownload: boolean;
    } | null,
    uploadOwner: null as string | null,
    membership: {
      role: "ADMIN",
      status: "ACTIVE",
      blockedAt: null as Date | null,
    } as null | { role: string; status: string; blockedAt: Date | null },
    assignedRooms: ["room"],
  };
  // Controlled database doubles isolate authorization policy. The separate
  // HTTP harness proves real session, database and storage behavior.
  const database = {
    link: { findUnique: async () => state.link },
    userTeam: { findUnique: async () => state.membership },
    userDataroom: {
      findMany: async () =>
        state.assignedRooms.map((dataroomId) => ({ dataroomId })),
    },
    dataroomDocument: {
      findUnique: async () => (state.attached ? { id: "room-document" } : null),
      findFirst: async () =>
        state.attached && state.assignedRooms.length
          ? { id: "room-document" }
          : null,
    },
    viewerGroupAccessControls: { findUnique: async () => state.permission },
    permissionGroupAccessControls: { findUnique: async () => state.permission },
    documentUpload: {
      findFirst: async ({ where }: { where: { viewerId: string } }) =>
        state.uploadOwner === where.viewerId ? { id: "upload" } : null,
    },
  } as unknown as PageAccessDatabase;
  const input = {
    linkId: "link",
    documentId: "document",
    documentTeamId: "team",
    dataroomId: "room",
    viewerId: "viewer",
    viewerEmail: "guest@example.com",
    verified: true,
  };
  return { state, database, input };
}

test("a valid existing session loses page issuance immediately after archive, deletion, expiry or freeze", async () => {
  for (const revoke of [
    (s: ReturnType<typeof fixture>["state"]) => {
      s.link.isArchived = true;
    },
    (s: ReturnType<typeof fixture>["state"]) => {
      s.link.deletedAt = new Date();
    },
    (s: ReturnType<typeof fixture>["state"]) => {
      s.link.expiresAt = new Date(Date.now() - 1);
    },
    (s: ReturnType<typeof fixture>["state"]) => {
      s.link.dataroom.isFrozen = true;
    },
  ]) {
    const { state, database, input } = fixture();
    assert.equal(await canIssuePageUrls(input, database), true);
    revoke(state);
    assert.equal(await canIssuePageUrls(input, database), false);
  }
});

test("current audience edits override a previously accepted verified email", async () => {
  const { state, database, input } = fixture();
  assert.equal(await canIssuePageUrls(input, database), true);
  state.link.allowList = ["replacement@example.com"];
  assert.equal(await canIssuePageUrls(input, database), false);
  state.link.allowList = [input.viewerEmail];
  state.link.denyList = [input.viewerEmail];
  assert.equal(await canIssuePageUrls(input, database), false);
});

test("new verification requirements and foreign document/room/team combinations fail closed", async () => {
  const { state, database, input } = fixture();
  assert.equal(
    await canIssuePageUrls({ ...input, verified: false }, database),
    false,
  );
  assert.equal(
    await canIssuePageUrls({ ...input, documentTeamId: "foreign" }, database),
    false,
  );
  assert.equal(
    await canIssuePageUrls({ ...input, dataroomId: "foreign" }, database),
    false,
  );
  state.attached = false;
  assert.equal(await canIssuePageUrls(input, database), false);
});

test("revoking a current document ACL denies refresh even with an established view", async () => {
  const { state, database, input } = fixture();
  state.link.permissionGroupId = "permissions";
  assert.equal(await canIssuePageUrls(input, database), true);
  state.permission = { canView: false, canDownload: false };
  assert.equal(await canIssuePageUrls(input, database), false);
  state.permission = null;
  assert.equal(await canIssuePageUrls(input, database), false);
});

test("the uploader exception requires verified identity and the actual upload owner", async () => {
  const { state, database, input } = fixture();
  state.link.permissionGroupId = "permissions";
  state.permission = null;
  state.uploadOwner = input.viewerId;
  assert.equal(await canIssuePageUrls(input, database), true);
  assert.equal(
    await canIssuePageUrls({ ...input, verified: false }, database),
    false,
  );
  assert.equal(
    await canIssuePageUrls({ ...input, viewerId: "other-viewer" }, database),
    false,
  );
});

test("current group membership is required separately from the link allow list", async () => {
  const { state, database, input } = fixture();
  state.link.audienceType = "GROUP";
  state.link.groupId = "group";
  state.link.group = {
    allowAll: false,
    domains: [],
    members: [{ viewer: { email: input.viewerEmail } }],
  };
  assert.equal(await canIssuePageUrls(input, database), true);
  state.link.group.members = [];
  assert.equal(await canIssuePageUrls(input, database), false);
});

test("owner preview preserves archived inspection but checks current active membership", async () => {
  const { state, database, input } = fixture();
  state.link.isArchived = true;
  state.link.dataroom.isFrozen = true;
  const preview = { ...input, previewUserId: "owner" };
  assert.equal(await canIssuePageUrls(preview, database), true);
  state.membership = null;
  assert.equal(await canIssuePageUrls(preview, database), false);
  state.membership = { role: "ADMIN", status: "ACTIVE", blockedAt: new Date() };
  assert.equal(await canIssuePageUrls(preview, database), false);
});

test("a preview token cannot retain a scoped room assignment after removal", async () => {
  const { state, database, input } = fixture();
  state.membership!.role = "DATAROOM_MEMBER";
  const preview = { ...input, previewUserId: "member" };
  assert.equal(await canIssuePageUrls(preview, database), true);
  state.assignedRooms = [];
  assert.equal(await canIssuePageUrls(preview, database), false);
});

test("document-only issuance remains bound to the linked document", async () => {
  const { state, database, input } = fixture();
  state.link.dataroomId = null;
  state.link.documentId = input.documentId;
  assert.equal(
    await canIssuePageUrls({ ...input, dataroomId: null }, database),
    true,
  );
  assert.equal(
    await canIssuePageUrls(
      { ...input, dataroomId: null, documentId: "other" },
      database,
    ),
    false,
  );
});
