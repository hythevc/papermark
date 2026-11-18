import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";

import { readBillingPlan, stripeConfiguredForPlan } from "./plan-response";

const team = {
  plan: "datarooms-plus+drtrial",
  stripeId: null,
  subscriptionId: null,
  startsAt: null,
  endsAt: null,
  pausedAt: null,
  pauseStartsAt: null,
  pauseEndsAt: null,
  cancelledAt: null,
  trialEndsAt: new Date("2026-12-01T00:00:00Z"),
};
const linked = {
  ...team,
  stripeId: "customer-fixture",
  subscriptionId: "subscription-fixture",
};
const subscription = (
  interval: string = "year",
  customer: string = "customer-fixture",
) =>
  ({
    customer,
    status: "active",
    items: {
      data: [{ price: { recurring: { interval, interval_count: 1 } } }],
    },
    discount: null,
  }) as unknown as Stripe.Subscription;

test("stored paid/trial entitlement remains real without Stripe, with unknown cycle and no invented payment", async () => {
  const result = await readBillingPlan(team, {
    providerConfigured: false,
    withDiscount: true,
    retrieveSubscription: async () => {
      throw new Error("Must not call an unconfigured provider");
    },
  });
  assert.equal(result.plan, team.plan);
  assert.equal(result.source, "stored-entitlement");
  assert.equal(result.trialEndsAt, "2026-12-01T00:00:00.000Z");
  assert.equal(result.billingProviderState, "unconfigured");
  assert.equal(result.providerVerified, false);
  assert.equal(result.isCustomer, false);
  assert.equal(result.subscriptionCycle, null);
  assert.equal(result.subscriptionStatus, null);
  assert.equal(result.discount, null);
  assert.equal(result.discountState, "unavailable");
  assert.equal(result.billingActionsAvailable, false);
  assert.ok(result.billingActionsReason.includes("not set up"));
});

test("configured but unlinked free workspace does not retrieve or invent a subscription", async () => {
  let calls = 0;
  const result = await readBillingPlan(
    { ...team, plan: "free", trialEndsAt: null },
    {
      providerConfigured: true,
      withDiscount: false,
      retrieveSubscription: async () => {
        calls++;
        return subscription();
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(result.plan, "free");
  assert.equal(result.billingProviderState, "not_linked");
  assert.equal(result.subscriptionCycle, null);
  assert.equal(result.discountState, "not_requested");
});

test("verified subscription maps its actual interval and discount without synthesizing prices", async () => {
  const actual = subscription();
  actual.discount = {
    coupon: {
      id: "coupon-fixture",
      percent_off: 25,
      amount_off: null,
      duration: "once",
      duration_in_months: null,
      valid: true,
    },
    end: null,
  } as Stripe.Discount;
  const result = await readBillingPlan(linked, {
    providerConfigured: true,
    withDiscount: true,
    retrieveSubscription: async (id) => {
      assert.equal(id, linked.subscriptionId);
      return actual;
    },
  });
  assert.equal(result.billingProviderState, "verified");
  assert.equal(result.providerVerified, true);
  assert.equal(result.subscriptionCycle, "yearly");
  assert.equal(result.subscriptionStatus, "active");
  assert.equal(result.discount?.percentOff, 25);
  assert.equal(result.discount?.amountOff, undefined);
  assert.equal(result.discountState, "available");
  assert.equal(result.plan, linked.plan);
  assert.equal(
    result.billingActionsAvailable,
    false,
    "verified provider does not invent missing paid mutation APIs",
  );
});

test("provider failure or a different customer's subscription cannot replace or enrich the stored entitlement", async () => {
  for (const retrieveSubscription of [
    async () => {
      throw new Error("Provider unavailable");
    },
    async () => subscription("year", "other-customer"),
  ]) {
    const result = await readBillingPlan(linked, {
      providerConfigured: true,
      withDiscount: true,
      retrieveSubscription,
    });
    assert.equal(result.plan, linked.plan);
    assert.equal(result.billingProviderState, "unavailable");
    assert.equal(result.providerVerified, false);
    assert.equal(result.subscriptionCycle, null);
    assert.equal(result.subscriptionStatus, null);
    assert.equal(result.discount, null);
  }
});

test("an unsupported billing interval stays unknown rather than being labeled monthly", async () => {
  const result = await readBillingPlan(linked, {
    providerConfigured: true,
    withDiscount: true,
    retrieveSubscription: async () => subscription("week"),
  });
  assert.equal(result.providerVerified, true);
  assert.equal(result.subscriptionCycle, null);
  assert.equal(result.discountState, "none");
});

test("legacy/current billing configuration follows the stored account suffix and ignores blank keys", () => {
  assert.equal(stripeConfiguredForPlan("pro", {}), false);
  assert.equal(
    stripeConfiguredForPlan("pro", { STRIPE_SECRET_KEY: "configured" }),
    true,
  );
  assert.equal(
    stripeConfiguredForPlan("pro+old", { STRIPE_SECRET_KEY: "configured" }),
    false,
  );
  assert.equal(
    stripeConfiguredForPlan("pro+old", { STRIPE_SECRET_KEY_OLD: "configured" }),
    true,
  );
  assert.equal(
    stripeConfiguredForPlan("pro", {
      STRIPE_SECRET_KEY: " ",
      STRIPE_SECRET_KEY_LIVE: " ",
    }),
    false,
  );
});
