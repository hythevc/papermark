import assert from "node:assert/strict";
import test from "node:test";

import { usesInlineDocumentProcessing } from "./document-processing";

test("production inline processing does not enable development service capture", () => {
  assert.equal(
    usesInlineDocumentProcessing({
      NODE_ENV: "production",
      ROOMLINE_PROCESSING_MODE: "inline",
    }),
    true,
  );
  assert.equal(
    usesInlineDocumentProcessing({
      NODE_ENV: "production",
      ROOMLINE_PROCESSING_MODE: "trigger",
    }),
    false,
  );
});

test("unset processing mode preserves the strict existing local integration behavior", () => {
  assert.equal(usesInlineDocumentProcessing({ NODE_ENV: "production" }), false);
  assert.equal(
    usesInlineDocumentProcessing({
      NODE_ENV: "development",
      ROOMLINE_LOCAL_INTEGRATION: "1",
    }),
    true,
  );
  assert.equal(
    usesInlineDocumentProcessing({
      NODE_ENV: "development",
      ROOMLINE_LOCAL_INTEGRATION: "1",
      ROOMLINE_PROCESSING_MODE: "trigger",
    }),
    false,
  );
  assert.throws(
    () =>
      usesInlineDocumentProcessing({
        NODE_ENV: "production",
        ROOMLINE_LOCAL_INTEGRATION: "1",
      }),
    /NODE_ENV=development/,
  );
});

test("invalid processing modes cannot silently change the worker", () => {
  for (const mode of ["", "INLINE", "inline ", "disabled", "fake"]) {
    assert.throws(
      () => usesInlineDocumentProcessing({ ROOMLINE_PROCESSING_MODE: mode }),
      /must be inline or trigger/,
    );
  }
});
