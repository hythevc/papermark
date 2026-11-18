import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import {
  hasProvisioningSubscription,
  premiumTeamLimit,
} from "./team-provisioning";

// Conservative deployment default: extra paid workspaces require the business
// to configure its actual allowance instead of inventing a paid entitlement.
export const PREMIUM_TEAM_LIMIT = premiumTeamLimit(
  process.env.ROOMLINE_PREMIUM_TEAM_LIMIT,
);

export async function getPremiumTeamEligibility(
  userId: string,
  db: Pick<Prisma.TransactionClient, "userTeam"> = prisma,
) {
  const memberships = await db.userTeam.findMany({
    where: {
      userId,
      role: "ADMIN",
      status: "ACTIVE",
      blockedAt: null,
      team: { plan: { startsWith: "datarooms-premium" } },
    },
    select: {
      team: {
        select: {
          plan: true,
          subscriptionId: true,
          cancelledAt: true,
          pausedAt: true,
          endsAt: true,
        },
      },
    },
  });
  const isPremiumAdmin = memberships.some(({ team }) =>
    hasProvisioningSubscription(team, "datarooms-premium"),
  );
  return {
    isPremiumAdmin,
    canCreate: isPremiumAdmin && memberships.length < PREMIUM_TEAM_LIMIT,
  };
}
