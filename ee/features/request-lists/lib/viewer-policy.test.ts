import assert from "node:assert/strict";
import test from "node:test";

import {
  RequestListAccessError,
  assertRequestLinkAccess,
  assertViewerTaskAction,
} from "./access-policy";
import { isViewerAssigned } from "./assignments";
import { resolveUploadFolder } from "./upload-folder";

const now = 1_800_000_000_000;
const session = {
  linkId: "link-a",
  dataroomId: "room-a",
  viewId: "view-a",
  viewerId: "viewer-a",
  verified: true,
  expiresAt: now + 60_000,
};
const link = {
  id: "link-a",
  dataroomId: "room-a",
  teamId: "team-a",
  isArchived: false,
  deletedAt: null,
  expiresAt: null,
};
const denied = (status: number) => (error: unknown) =>
  error instanceof RequestListAccessError && error.status === status;

test("request access requires a verified, current session bound to this link and room", () => {
  assert.doesNotThrow(() =>
    assertRequestLinkAccess(session, link, "link-a", "room-a", now),
  );
  for (const invalid of [
    null,
    { ...session, verified: false },
    { ...session, viewerId: undefined },
    { ...session, expiresAt: now },
  ]) {
    assert.throws(
      () => assertRequestLinkAccess(invalid, link, "link-a", "room-a", now),
      denied(401),
    );
  }
  for (const invalid of [
    { ...session, linkId: "other" },
    { ...session, dataroomId: "other" },
    { ...session, viewId: "" },
  ]) {
    assert.throws(
      () => assertRequestLinkAccess(invalid, link, "link-a", "room-a", now),
      denied(403),
    );
  }
});

test("archived, deleted, expired and cross-room links cannot reuse a valid session", () => {
  for (const invalid of [
    null,
    { ...link, isArchived: true },
    { ...link, deletedAt: new Date(now) },
    { ...link, expiresAt: new Date(now) },
    { ...link, dataroomId: "other" },
    { ...link, teamId: null },
  ]) {
    assert.throws(
      () => assertRequestLinkAccess(session, invalid, "link-a", "room-a", now),
      denied(403),
    );
  }
});

test("only one matching explicit assignment grants access; no assignment is private", () => {
  const identity = {
    viewerId: "viewer-a",
    email: " Person@Example.com ",
    linkId: "link-a",
    groupIds: new Set(["group-a"]),
  };
  for (const assignment of [
    { viewerId: "viewer-a" },
    { email: "person@example.com" },
    { groupId: "group-a" },
    { linkId: "link-a" },
  ]) {
    assert.equal(isViewerAssigned([assignment], identity), true);
  }
  for (const assignments of [
    [],
    [{}],
    [{ viewerId: "other" }],
    [{ groupId: "other" }],
    [{ email: "someone@example.com" }],
    [{ linkId: "other" }],
    [{ viewerId: "viewer-a", email: "person@example.com" }],
  ]) {
    assert.equal(isViewerAssigned(assignments, identity), false);
  }
  assert.equal(
    isViewerAssigned([{ email: "person@example.com" }], {
      ...identity,
      email: null,
    }),
    false,
  );
});

test("visitors submit for host review, cannot complete, and need a file for upload requests", () => {
  assert.doesNotThrow(() =>
    assertViewerTaskAction({ type: "TODO", status: "OPEN" }, "SUBMITTED"),
  );
  assert.throws(
    () => assertViewerTaskAction({ type: "TODO", status: "OPEN" }, "COMPLETED"),
    denied(403),
  );
  assert.throws(
    () =>
      assertViewerTaskAction({ type: "UPLOAD", status: "OPEN" }, "SUBMITTED"),
    denied(400),
  );
  assert.doesNotThrow(() =>
    assertViewerTaskAction(
      { type: "UPLOAD", status: "OPEN" },
      "SUBMITTED",
      true,
    ),
  );
  assert.throws(
    () =>
      assertViewerTaskAction(
        { type: "TODO", status: "COMPLETED" },
        "IN_PROGRESS",
      ),
    denied(403),
  );
  assert.doesNotThrow(() =>
    assertViewerTaskAction({ type: "TODO", status: "COMPLETED" }),
  );
});

test("task destinations override generic folders and reject cross-room or removed folders", () => {
  const base = {
    isTaskUpload: true,
    requestedFolderId: "other",
    allowedFolderIds: ["generic"],
    validFolderIds: new Set(["request", "generic"]),
  };
  assert.equal(
    resolveUploadFolder({ ...base, taskFolderId: "request" }),
    "request",
  );
  assert.equal(resolveUploadFolder({ ...base, taskFolderId: null }), "generic");
  assert.equal(
    resolveUploadFolder({
      ...base,
      taskFolderId: null,
      allowedFolderIds: [],
      requestedFolderId: undefined,
    }),
    null,
  );
  assert.throws(
    () => resolveUploadFolder({ ...base, taskFolderId: "cross-room" }),
    denied(403),
  );
  assert.equal(
    resolveUploadFolder({ ...base, isTaskUpload: false }),
    "generic",
  );
  assert.throws(
    () =>
      resolveUploadFolder({
        ...base,
        isTaskUpload: false,
        validFolderIds: new Set(),
      }),
    denied(403),
  );
  assert.throws(
    () =>
      resolveUploadFolder({
        ...base,
        isTaskUpload: false,
        allowedFolderIds: [],
      }),
    denied(403),
  );
});
