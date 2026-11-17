import assert from "node:assert/strict";
import test from "node:test";

import {
  rectangleFromPoints,
  redactionRequest,
  validateRegion,
} from "./redaction-client";

test("manual areas reject empty, nonfinite, and out-of-page positions", () => {
  for (const region of [
    { x: 0, y: 0, width: 0, height: 100 },
    { x: 0, y: 0, width: 100, height: -1 },
    { x: -1, y: 0, width: 100, height: 100 },
    { x: 900, y: 0, width: 101, height: 100 },
    { x: 0, y: 990, width: 100, height: 11 },
    { x: NaN, y: 0, width: 100, height: 100 },
    { x: 0, y: 0, width: Infinity, height: 100 },
  ])
    assert.equal(validateRegion(region), false);
  assert.equal(validateRegion({ x: 0, y: 0, width: 1000, height: 1000 }), true);
  assert.equal(validateRegion({ x: 990, y: 990, width: 10, height: 10 }), true);
});

test("drawing works in every direction and clamps captured pointers to the page", () => {
  const expected = { x: 100, y: 200, width: 300, height: 400 };
  assert.deepEqual(
    rectangleFromPoints({ x: 100, y: 200 }, { x: 400, y: 600 }),
    expected,
  );
  assert.deepEqual(
    rectangleFromPoints({ x: 400, y: 600 }, { x: 100, y: 200 }),
    expected,
  );
  assert.deepEqual(
    rectangleFromPoints({ x: 400, y: 200 }, { x: 100, y: 600 }),
    expected,
  );
  assert.deepEqual(
    rectangleFromPoints({ x: -50, y: -50 }, { x: 1100, y: 1100 }),
    { x: 0, y: 0, width: 1000, height: 1000 },
  );
});

test("client preserves intentional plain-text API failures and hides server errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        "This job is no longer editable. Create a new job to continue.",
        { status: 409 },
      );
    await assert.rejects(
      redactionRequest("/local-fixture"),
      /Create a new job/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          message: "Manual redaction is not enabled for this workspace.",
        }),
        { status: 403 },
      );
    await assert.rejects(redactionRequest("/local-fixture"), /not enabled/);
    globalThis.fetch = async () =>
      new Response("Private processing diagnostic", { status: 500 });
    await assert.rejects(redactionRequest("/local-fixture"), {
      message:
        "Unable to complete this redaction request. Refresh and try again.",
    });
    globalThis.fetch = async () =>
      new Response("<html>Sign in</html>", { status: 200 });
    await assert.rejects(redactionRequest("/local-fixture"), /Unable to read/);
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ versionId: "version", revalidationPending: true }),
        { status: 200 },
      );
    assert.deepEqual(await redactionRequest("/local-fixture"), {
      versionId: "version",
      revalidationPending: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
