import assert from "node:assert/strict";
import test from "node:test";

import { decodeSlackIntegration } from "./status";
import type { SlackIntegration } from "./types";

test("an unavailable response never masquerades as an installed integration", () => {
  assert.deepEqual(
    decodeSlackIntegration({
      configured: false,
      integration: null,
      message: "Unavailable",
    }),
    { configured: false, integration: null },
  );
});

test("a configured installation retains its actual payload", () => {
  const installation = { id: "installed", enabled: false } as SlackIntegration;
  const decoded = decodeSlackIntegration(installation);
  assert.equal(decoded.configured, true);
  assert.equal(decoded.integration, installation);
});

test("configured but not installed is distinct from unavailable", () => {
  assert.deepEqual(
    decodeSlackIntegration({ configured: true, integration: null }),
    { configured: true, integration: null },
  );
  assert.deepEqual(decodeSlackIntegration(undefined, 404), {
    configured: true,
    integration: null,
  });
});

test("loading and remote failures do not offer installation as if configuration were known", () => {
  for (const status of [undefined, 401, 403, 429, 500, 502, 503]) {
    assert.deepEqual(decodeSlackIntegration(undefined, status), {
      configured: null,
      integration: null,
    });
  }
});
