import assert from "node:assert/strict";
import test from "node:test";

import {
  hasProvisioningSubscription,
  premiumTeamLimit,
} from "./team-provisioning";

const now = new Date("2026-11-17T12:00:00Z");
const team = {
  plan: "datarooms-premium",
  subscriptionId: "sub_test",
  cancelledAt: null,
  pausedAt: null,
  endsAt: new Date("2026-12-17T12:00:00Z"),
};

test("provisioning requires the exact paid tier and a live subscription", () => {
  assert.equal(
    hasProvisioningSubscription(team, "datarooms-premium", now),
    true,
  );
  for (const change of [
    { subscriptionId: null },
    { plan: "datarooms-premium-trial" },
    { plan: "datarooms-unlimited" },
    { endsAt: now },
    { pausedAt: now },
    { cancelledAt: now, endsAt: null },
  ]) {
    assert.equal(
      hasProvisioningSubscription(
        { ...team, ...change },
        "datarooms-premium",
        now,
      ),
      false,
    );
  }
  // Cancellation at period end retains the already-paid period.
  assert.equal(
    hasProvisioningSubscription(
      { ...team, cancelledAt: now },
      "datarooms-premium",
      now,
    ),
    true,
  );
});

test("extra premium workspaces require a configured allowance", () => {
  assert.equal(premiumTeamLimit(undefined), 1);
  assert.equal(premiumTeamLimit("3"), 3);
  for (const value of ["0", "-1", "1.5", "3oops"])
    assert.throws(() => premiumTeamLimit(value));
});
