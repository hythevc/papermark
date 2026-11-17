import type { NextApiRequest, NextApiResponse } from "next";

import { stripeInstance } from "@/ee/stripe";

import { withTeamApi } from "@/lib/api/auth/with-session-team";
import {
  readBillingPlan,
  stripeConfiguredForPlan,
} from "@/lib/billing/plan-response";
import prisma from "@/lib/prisma";

const read = withTeamApi(
  async ({ req, res, teamId, permissions }) => {
    if (
      req.query.withDiscount !== undefined &&
      !["true", "false"].includes(req.query.withDiscount as string)
    )
      return res.status(400).json({ error: "Invalid discount option." });
    if (req.query.withDiscount === "true" && !permissions.has("team.read"))
      return res
        .status(403)
        .json({ error: "You cannot view workspace billing details." });
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          plan: true,
          stripeId: true,
          subscriptionId: true,
          startsAt: true,
          endsAt: true,
          pausedAt: true,
          pauseStartsAt: true,
          pauseEndsAt: true,
          cancelledAt: true,
          trialEndsAt: true,
        },
      });
      if (!team) return res.status(404).json({ error: "Workspace not found." });
      const withDiscount = req.query.withDiscount === "true";
      const result = await readBillingPlan(team, {
        providerConfigured: stripeConfiguredForPlan(team.plan, process.env),
        withDiscount,
        retrieveSubscription: (id) =>
          stripeInstance(
            team.plan.split("+").includes("old"),
          ).subscriptions.retrieve(
            id,
            withDiscount ? { expand: ["discount.coupon"] } : {},
            { timeout: 5000, maxNetworkRetries: 0 },
          ),
      });
      return res.status(200).json(result);
    } catch {
      return res
        .status(500)
        .json({ error: "Unable to read workspace plan. Try again." });
    }
  },
  {
    // Plan gates are needed by every active workspace member, including scoped
    // room members. No customer/subscription IDs or payment details are returned.
    requiredPermissions: ["datarooms.read"],
  },
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  return read(req, res);
}
