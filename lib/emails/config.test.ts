import assert from "node:assert/strict";
import test from "node:test";

import { resolveEmailIdentity } from "./config";

const sender = "Roomline <mail@owned.example>";

test("unconfigured default email fails before a send can use another business identity", () => {
  assert.throws(() => resolveEmailIdentity({}, {}), /Set EMAIL_FROM/);
  assert.throws(
    () => resolveEmailIdentity({ verify: true }, { EMAIL_FROM_VERIFY: sender }),
    /Set EMAIL_FROM/,
  );
});

test("configured base sender works for transactional and scheduled callers", () => {
  for (const options of [{}, { verify: true }, { system: true }]) {
    assert.equal(
      resolveEmailIdentity(options, { EMAIL_FROM: sender }).from,
      sender,
    );
  }
});

test("verification, system, and marketing overrides select the appropriate owned sender", () => {
  const environment = {
    EMAIL_FROM: sender,
    EMAIL_FROM_VERIFY: "verify@owned.example",
    EMAIL_FROM_SYSTEM: "system@owned.example",
    EMAIL_FROM_MARKETING: "updates@owned.example",
    EMAIL_POSTAL_ADDRESS: "An owned business postal address",
    EMAIL_MARKETING_UNSUBSCRIBE_URL: "https://owned.example/email/preferences",
  };
  assert.equal(
    resolveEmailIdentity({ verify: true }, environment).from,
    environment.EMAIL_FROM_VERIFY,
  );
  assert.equal(
    resolveEmailIdentity({ system: true }, environment).from,
    environment.EMAIL_FROM_SYSTEM,
  );
  assert.equal(
    resolveEmailIdentity({ marketing: true }, environment).from,
    environment.EMAIL_FROM_MARKETING,
  );
});

test("explicit caller identities remain supported and reply-to has no upstream fallback", () => {
  assert.deepEqual(
    resolveEmailIdentity(
      { from: "Custom <custom@owned.example>", replyTo: "reply@owned.example" },
      { EMAIL_REPLY_TO: "fallback@owned.example" },
    ),
    {
      from: "Custom <custom@owned.example>",
      replyTo: "reply@owned.example",
      postalAddress: undefined,
      unsubscribeUrl: undefined,
    },
  );
  assert.equal(
    resolveEmailIdentity({}, { EMAIL_FROM: sender }).replyTo,
    undefined,
  );
  assert.equal(
    resolveEmailIdentity(
      {},
      { EMAIL_FROM: sender, EMAIL_REPLY_TO: "reply@owned.example" },
      "support@owned.example",
    ).replyTo,
    "reply@owned.example",
  );
  assert.equal(
    resolveEmailIdentity({}, { EMAIL_FROM: sender }, "support@owned.example")
      .replyTo,
    "support@owned.example",
  );
});

test("marketing requires a postal address and a usable unsubscribe URL", () => {
  for (const environment of [
    { EMAIL_FROM: sender },
    { EMAIL_FROM: sender, EMAIL_POSTAL_ADDRESS: "Owned address" },
    {
      EMAIL_FROM: sender,
      EMAIL_POSTAL_ADDRESS: "Owned address",
      EMAIL_MARKETING_UNSUBSCRIBE_URL: "javascript:alert(1)",
    },
  ]) {
    assert.throws(
      () => resolveEmailIdentity({ marketing: true }, environment),
      /Marketing email requires/,
    );
  }
  const result = resolveEmailIdentity(
    {
      marketing: true,
      unsubscribeUrl: "https://owned.example/unsubscribe/token",
    },
    { EMAIL_FROM: sender, EMAIL_POSTAL_ADDRESS: "Owned address" },
  );
  assert.equal(
    result.unsubscribeUrl,
    "https://owned.example/unsubscribe/token",
  );
});
