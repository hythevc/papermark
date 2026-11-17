import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

import { hasProvisioningSubscription } from "./team-provisioning";

export async function canCreateUnlimitedTeam(
  userId: string,
  db: Pick<Prisma.TransactionClient, "userTeam"> = prisma,
) {
  const memberships = await db.userTeam.findMany({
    where: {
      userId,
      role: "ADMIN",
      status: "ACTIVE",
      blockedAt: null,
      team: { plan: { startsWith: "datarooms-unlimited" } },
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
  return memberships.some(({ team }) =>
    hasProvisioningSubscription(team, "datarooms-unlimited"),
  );
}
