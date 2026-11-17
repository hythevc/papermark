import assert from "node:assert/strict";
import test from "node:test";

import { redactRuntimeLine } from "./redact.mjs";

test("redacts configured secrets and URL auth material without losing status", () => {
  const secret = "local-secret-with/+value";
  const output = redactRuntimeLine(
    `GET /api/revalidate?secret=${encodeURIComponent(secret)}&documentId=doc_test 200 API ${secret}`,
    { REVALIDATE_TOKEN: secret },
  );
  assert.ok(!output.includes(secret));
  assert.ok(!output.includes(encodeURIComponent(secret)));
  assert.ok(output.includes("documentId=doc_test 200"));
  assert.equal(
    redactRuntimeLine(
      "GET /auth/callback?token=opaque&code=LOGIN&next=%2Fdashboard 302",
      {},
    ),
    "GET /auth/callback?token=[redacted]&code=[redacted]&next=%2Fdashboard 302",
  );
});

test("redacts credential headers but retains ordinary application paths", () => {
  assert.equal(
    redactRuntimeLine("Authorization: Bearer opaque", {}),
    "Authorization: [redacted]",
  );
  assert.equal(
    redactRuntimeLine("set-cookie: session=opaque; HttpOnly", {}),
    "set-cookie: [redacted]",
  );
  assert.equal(
    redactRuntimeLine("GET /dashboard 200", {}),
    "GET /dashboard 200",
  );
});

test("redacts preview tokens and OAuth state in query strings and fragments", () => {
  assert.equal(
    redactRuntimeLine(
      "GET /view/sample?previewToken=preview-value&state=oauth-state&next=%2Fdocuments 200",
      {},
    ),
    "GET /view/sample?previewToken=[redacted]&state=[redacted]&next=%2Fdocuments 200",
  );
  assert.equal(
    redactRuntimeLine("/callback#access_token=fragment-value&otp=123456", {}),
    "/callback#access_token=[redacted]&otp=[redacted]",
  );
});
