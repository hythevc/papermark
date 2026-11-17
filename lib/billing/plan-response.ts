import type { SubscriptionDiscount } from "@/ee/stripe/functions/get-subscription-item";
import type Stripe from "stripe";

export type BillingProviderState =
  | "unconfigured"
  | "not_linked"
  | "verified"
  | "unavailable";

export type BillingPlanResponse = {
  /** Actual stored entitlement; it is not evidence of a provider payment. */
  plan: string;
  source: "stored-entitlement";
  startsAt: string | null;
  endsAt: string | null;
  pausedAt: string | null;
  pauseStartsAt: string | null;
  pauseEndsAt: string | null;
  isPaused: boolean;
  cancelledAt: string | null;
  trialEndsAt: string | null;
  /** A stored customer association, not a verified active subscription. */
  isCustomer: boolean;
  subscriptionCycle: "monthly" | "yearly" | null;
  subscriptionStatus: Stripe.Subscription.Status | null;
  discount: SubscriptionDiscount | null;
  discountState: "not_requested" | "unavailable" | "none" | "available";
  billingProviderState: BillingProviderState;
  providerVerified: boolean;
  /** Mutation APIs/catalog are not implemented or bound in this deployment. */
  billingActionsAvailable: boolean;
  billingActionsReason: string;
};

type StoredBillingPlan = {
  plan: string;
  stripeId: string | null;
  subscriptionId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  pausedAt: Date | null;
  pauseStartsAt: Date | null;
  pauseEndsAt: Date | null;
  cancelledAt: Date | null;
  trialEndsAt: Date | null;
};

export function stripeConfiguredForPlan(
  plan: string,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return plan.split("+").includes("old")
    ? !!(
        env.STRIPE_SECRET_KEY_LIVE_OLD?.trim() ||
        env.STRIPE_SECRET_KEY_OLD?.trim()
      )
    : !!(env.STRIPE_SECRET_KEY_LIVE?.trim() || env.STRIPE_SECRET_KEY?.trim());
}

export async function readBillingPlan(
  team: StoredBillingPlan,
  options: {
    providerConfigured: boolean;
    withDiscount: boolean;
    retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
  },
): Promise<BillingPlanResponse> {
  const response: BillingPlanResponse = {
    plan: team.plan,
    source: "stored-entitlement",
    startsAt: team.startsAt?.toISOString() ?? null,
    endsAt: team.endsAt?.toISOString() ?? null,
    pausedAt: team.pausedAt?.toISOString() ?? null,
    pauseStartsAt: team.pauseStartsAt?.toISOString() ?? null,
    pauseEndsAt: team.pauseEndsAt?.toISOString() ?? null,
    isPaused: !!team.pausedAt,
    cancelledAt: team.cancelledAt?.toISOString() ?? null,
    trialEndsAt: team.trialEndsAt?.toISOString() ?? null,
    isCustomer: !!team.stripeId,
    subscriptionCycle: null,
    subscriptionStatus: null,
    discount: null,
    discountState: options.withDiscount ? "unavailable" : "not_requested",
    billingProviderState: options.providerConfigured
      ? "not_linked"
      : "unconfigured",
    providerVerified: false,
    billingActionsAvailable: false,
    billingActionsReason: options.providerConfigured
      ? "Paid billing changes are not available in this deployment. Your current workspace access remains unchanged."
      : "Paid billing is not set up for this deployment. Your current workspace access remains unchanged; a workspace administrator must finish billing setup.",
  };
  if (!options.providerConfigured || !team.stripeId || !team.subscriptionId)
    return response;

  try {
    const subscription = await options.retrieveSubscription(
      team.subscriptionId,
    );
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    if (customer !== team.stripeId)
      throw new Error("Subscription customer does not match this workspace.");
    const recurring = subscription.items.data
      .map(({ price }) => price.recurring)
      .filter((item) => item !== null);
    if (
      recurring.length &&
      recurring.every(
        (item) => item.interval === "month" && item.interval_count === 1,
      )
    )
      response.subscriptionCycle = "monthly";
    if (
      recurring.length &&
      recurring.every(
        (item) => item.interval === "year" && item.interval_count === 1,
      )
    )
      response.subscriptionCycle = "yearly";
    response.subscriptionStatus = subscription.status;
    response.providerVerified = true;
    response.billingProviderState = "verified";
    if (options.withDiscount) {
      const discount = subscription.discount;
      if (discount?.coupon) {
        const coupon = discount.coupon;
        response.discount = {
          couponId: coupon.id,
          percentOff: coupon.percent_off ?? undefined,
          amountOff: coupon.amount_off ?? undefined,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months ?? undefined,
          valid: coupon.valid,
          end: discount.end ?? undefined,
        };
      }
      response.discountState = response.discount ? "available" : "none";
    }
  } catch {
    // A usable stored entitlement is independent of provider availability.
    // Do not replace it with a fabricated free/active/paid subscription.
    response.billingProviderState = "unavailable";
    response.providerVerified = false;
    response.subscriptionCycle = null;
    response.subscriptionStatus = null;
    response.discount = null;
    response.discountState = options.withDiscount
      ? "unavailable"
      : "not_requested";
  }
  return response;
}
