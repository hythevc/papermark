import assert from "node:assert/strict";
import test from "node:test";

import { stripeInstance } from "./index";

const keyNames = [
  "STRIPE_SECRET_KEY",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_SECRET_KEY_OLD",
  "STRIPE_SECRET_KEY_LIVE_OLD",
] as const;

test("billing clients initialize on demand and keep legacy/current accounts separate", () => {
  const original = Object.fromEntries(
    keyNames.map((name) => [name, process.env[name]]),
  );
  for (const name of keyNames) delete process.env[name];
  try {
    assert.throws(() => stripeInstance(), /Stripe billing is not configured/);
    assert.throws(
      () => stripeInstance(true),
      /Legacy Stripe billing is not configured/,
    );

    // Constructor-only fixtures; these clients never make an API request.
    process.env.STRIPE_SECRET_KEY_LIVE = "";
    process.env.STRIPE_SECRET_KEY = "sk_test_roomline_current_fixture";
    const current = stripeInstance();
    assert.equal(stripeInstance(), current);
    assert.throws(
      () => stripeInstance(true),
      /Legacy Stripe billing is not configured/,
    );

    process.env.STRIPE_SECRET_KEY_OLD = "sk_test_roomline_legacy_fixture";
    const legacy = stripeInstance(true);
    assert.notEqual(legacy, current);
    assert.equal(stripeInstance(true), legacy);
  } finally {
    for (const name of keyNames) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
