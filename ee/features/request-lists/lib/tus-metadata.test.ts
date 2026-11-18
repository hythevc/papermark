import assert from "node:assert/strict";
import test from "node:test";

import { resolveTusIdentityMetadata } from "./tus-metadata";

test("initial TUS POST reads its header even though the server already assigned an ID", async () => {
  const metadata = await resolveTusIdentityMetadata({
    method: "POST",
    uploadId: "team/new/file",
    metadataHeader: `viewerId ${Buffer.from("viewer-a").toString("base64")},taskId ${Buffer.from("task-a").toString("base64")}`,
    loadMetadata: async () => {
      throw new Error("A new upload is not persisted yet");
    },
  });
  assert.deepEqual(metadata, { viewerId: "viewer-a", taskId: "task-a" });
});

test("resumed TUS upload uses persisted identity instead of changed headers", async () => {
  const metadata = await resolveTusIdentityMetadata({
    method: "PATCH",
    uploadId: "team/existing/file",
    metadataHeader: `viewerId ${Buffer.from("attacker").toString("base64")}`,
    loadMetadata: async (id) => {
      assert.equal(id, "team/existing/file");
      return { viewerId: "viewer-a", taskId: "task-a" };
    },
  });
  assert.deepEqual(metadata, { viewerId: "viewer-a", taskId: "task-a" });
});

test("missing metadata or an unbound resumed upload fails closed", async () => {
  await assert.rejects(
    () =>
      resolveTusIdentityMetadata({
        method: "POST",
        uploadId: "new-id",
        loadMetadata: async () => ({}),
      }),
    /Missing upload metadata/,
  );
  await assert.rejects(
    () =>
      resolveTusIdentityMetadata({
        method: "PATCH",
        loadMetadata: async () => ({}),
      }),
    /Upload identity is required/,
  );
});
