import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeVersionToken,
  canCreateDocumentVersion,
} from "./version-policy";

test("version writes require active, unblocked membership with an actual write verb", () => {
  const member = { role: "ADMIN", status: "ACTIVE", blockedAt: null };
  assert.equal(canCreateDocumentVersion(member), true);
  assert.equal(
    canCreateDocumentVersion({ ...member, role: "DATAROOM_MEMBER" }),
    true,
  );
  for (const membership of [
    null,
    { ...member, status: "INVITED" },
    { ...member, blockedAt: new Date() },
    { ...member, role: "UNKNOWN" },
  ]) {
    assert.equal(canCreateDocumentVersion(membership), false);
  }
});

test("version tokens enforce team, expiry and write scope without widening read-only grants", () => {
  const now = new Date("2026-11-17T00:00:00Z");
  const token = { teamId: "team", expires: null, scopes: "documents.write" };
  assert.equal(authorizeVersionToken(token, "team", now), "allowed");
  assert.equal(
    authorizeVersionToken({ ...token, scopes: "apis.all" }, "team", now),
    "allowed",
  );
  assert.equal(
    authorizeVersionToken({ ...token, scopes: null }, "team", now),
    "allowed",
  );
  assert.equal(authorizeVersionToken(token, "other-team", now), "unauthorized");
  assert.equal(authorizeVersionToken(null, "team", now), "unauthorized");
  assert.equal(
    authorizeVersionToken({ ...token, expires: now }, "team", now),
    "unauthorized",
  );
  for (const scopes of [
    "apis.read",
    "documents.read",
    "links.write",
    "",
    "unknown",
    "documents.write.other",
  ]) {
    assert.equal(
      authorizeVersionToken({ ...token, scopes }, "team", now),
      "forbidden",
    );
  }
});
