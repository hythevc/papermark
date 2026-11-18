import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlanPrice, resolvePlanPrice } from "@/components/billing/plan-price";

import {
  CURRENCY_SYMBOL,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
} from "./currency";
import { getPriceIdFromPlan } from "./functions/get-price-id-from-plan";
import { PLANS, getPlanFromPriceId } from "./utils";

test("unsupported currency cannot be presented as a configured checkout price", () => {
  assert.equal(isSupportedCurrency("eur"), true);
  for (const currency of ["usd", "gbp", undefined, null, ""]) {
    assert.equal(isSupportedCurrency(currency), false);
  }
  assert.equal(DEFAULT_CURRENCY, "eur");
  assert.equal(CURRENCY_SYMBOL[DEFAULT_CURRENCY], "€");
});

test("every displayed catalog amount retains its EUR price and legacy/current IDs", () => {
  for (const plan of PLANS) {
    for (const period of ["monthly", "yearly"] as const) {
      assert.deepEqual(
        resolvePlanPrice({
          amount: plan.price[period].amount,
          currency: "eur",
        }),
        {
          symbol: "€",
          value: plan.price[period].amount,
        },
      );
      for (const isOld of [false, true]) {
        const priceId = getPriceIdFromPlan({
          planSlug: plan.slug,
          period,
          isOld,
        });
        assert.equal(typeof priceId, "string");
        assert.equal(getPlanFromPriceId(priceId!, isOld)?.slug, plan.slug);
      }
    }
  }
});

test("annual display is a monthly equivalent with an explicit annual billing label", () => {
  const html = renderToStaticMarkup(
    PlanPrice({ amount: 99, period: "yearly", currency: "eur" }),
  );
  assert.match(html, /€99/);
  assert.match(html, /billed annually/);
});
