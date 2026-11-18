import Stripe from "stripe";

import { BRAND } from "@/lib/brand";

const clients: { old?: Stripe; current?: Stripe } = {};

export const stripeInstance = (account: boolean = false) => {
  const accountType = account ? "old" : "current";
  const existing = clients[accountType];
  if (existing) return existing;

  const secretKey = account
    ? process.env.STRIPE_SECRET_KEY_LIVE_OLD?.trim() ||
      process.env.STRIPE_SECRET_KEY_OLD?.trim()
    : process.env.STRIPE_SECRET_KEY_LIVE?.trim() ||
      process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      account
        ? "Legacy Stripe billing is not configured. Set STRIPE_SECRET_KEY_OLD or STRIPE_SECRET_KEY_LIVE_OLD."
        : "Stripe billing is not configured. Set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_LIVE.",
    );
  }

  // Instantiate only the account an actual billing operation needs.
  const client = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    appInfo: { name: BRAND.name, version: "0.1.0" },
    typescript: true,
  });
  clients[accountType] = client;
  return client;
};

export async function cancelSubscription(
  customer?: string,
  isOldAccount: boolean = false,
) {
  if (!customer) return;

  try {
    const stripe = stripeInstance(isOldAccount);
    const subscriptionId = await stripe.subscriptions
      .list({
        customer,
      })
      .then((res) => res.data[0].id);

    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: `Customer deleted their ${BRAND.name} instance.`,
      },
    });
  } catch (error) {
    return;
  }
}
