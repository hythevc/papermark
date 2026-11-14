import assert from "node:assert/strict";
import { test } from "node:test";

import {
  matchesNavigationPath,
  roomMobileSection,
  workspaceMobileSection,
} from "./mobile-navigation";

test("room overview stays distinct from documents, including resolved URLs", () => {
  assert.equal(roomMobileSection("/datarooms/[id]"), "overview");
  assert.equal(
    roomMobileSection("/datarooms/seed-round/?tab=summary#next"),
    "overview",
  );
  assert.equal(roomMobileSection("/datarooms"), null);
});

test("room document and group analytics routes keep the correct navigation context", () => {
  assert.equal(
    roomMobileSection("/datarooms/[id]/document/[documentId]"),
    "documents",
  );
  assert.equal(
    roomMobileSection("/datarooms/[id]/documents/[...name]"),
    "documents",
  );
  assert.equal(
    roomMobileSection("/datarooms/[id]/groups/[groupId]/group-analytics"),
    "permissions",
  );
  assert.equal(
    roomMobileSection("/datarooms/[id]/analytics/audit-log"),
    "analytics",
  );
  assert.equal(
    roomMobileSection("/datarooms/[id]/settings/file-permissions"),
    "more",
  );
});

test("workspace matches use path boundaries and ignore query values", () => {
  assert.equal(
    workspaceMobileSection("/documents/file-one?next=/datarooms"),
    "documents",
  );
  assert.equal(workspaceMobileSection("/documents-old"), "more");
  assert.equal(workspaceMobileSection("/workflows/new"), "more");
  assert.equal(workspaceMobileSection("/datarooms/seed-round"), "datarooms");
});

test("exact settings links do not claim descendant pages as the current page", () => {
  assert.equal(
    matchesNavigationPath("/settings/webhooks/new", "/settings/webhooks"),
    true,
  );
  assert.equal(
    matchesNavigationPath("/settings/webhooks/new", "/settings/webhooks", true),
    false,
  );
  assert.equal(
    matchesNavigationPath(
      "/settings/general/?saved=1",
      "/settings/general",
      true,
    ),
    true,
  );
  assert.equal(
    matchesNavigationPath("/settings/general-old", "/settings/general"),
    false,
  );
});
