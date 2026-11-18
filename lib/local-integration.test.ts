import assert from "node:assert/strict";
import test from "node:test";

import { isLocalIntegration, localSmtpOptions } from "./local-integration";

test("local services require explicit development opt-in", () => {
  assert.equal(isLocalIntegration({ NODE_ENV: "development" }), false);
  assert.equal(localSmtpOptions({ NODE_ENV: "production" }), null);
  for (const mode of ["production", "test", undefined]) {
    assert.throws(
      () =>
        isLocalIntegration({ NODE_ENV: mode, ROOMLINE_LOCAL_INTEGRATION: "1" }),
      /development/,
    );
  }
});

test("local SMTP cannot route to an external or ambiguous host", () => {
  for (const host of [
    "smtp.example.com",
    "127.0.0.1.example.com",
    "127.1",
    "http://localhost",
    "",
  ]) {
    assert.throws(
      () =>
        localSmtpOptions({
          NODE_ENV: "development",
          ROOMLINE_LOCAL_INTEGRATION: "1",
          EMAIL_SERVER_HOST: host,
        }),
      /loopback/,
    );
  }
  assert.equal(
    localSmtpOptions({
      NODE_ENV: "development",
      ROOMLINE_LOCAL_INTEGRATION: "1",
      EMAIL_SERVER_HOST: "localhost",
    })?.host,
    "127.0.0.1",
  );
});

test("local SMTP rejects malformed ports", () => {
  for (const port of ["0", "65536", "51025junk", "3.4", "", "-1"]) {
    assert.throws(
      () =>
        localSmtpOptions({
          NODE_ENV: "development",
          ROOMLINE_LOCAL_INTEGRATION: "1",
          EMAIL_SERVER_PORT: port,
        }),
      /valid SMTP port/,
    );
  }
  assert.equal(
    localSmtpOptions({
      NODE_ENV: "development",
      ROOMLINE_LOCAL_INTEGRATION: "1",
      EMAIL_SERVER_PORT: "51025",
    })?.port,
    51025,
  );
});
