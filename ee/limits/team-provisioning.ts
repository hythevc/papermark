type SubscriptionTeam = {
  plan: string;
  subscriptionId: string | null;
  cancelledAt: Date | null;
  pausedAt: Date | null;
  endsAt: Date | null;
};

/** Only an active paid source workspace can confer its provisioning benefit. */
export function hasProvisioningSubscription(
  team: SubscriptionTeam,
  plan: "datarooms-premium" | "datarooms-unlimited",
  now = new Date(),
) {
  return (
    team.plan.split("+")[0] === plan &&
    Boolean(team.subscriptionId) &&
    !team.pausedAt &&
    (!team.cancelledAt || Boolean(team.endsAt && team.endsAt > now)) &&
    (!team.endsAt || team.endsAt > now)
  );
}

export function premiumTeamLimit(value: string | undefined) {
  if (!value) return 1;
  const limit = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("ROOMLINE_PREMIUM_TEAM_LIMIT must be a positive integer.");
  }
  return limit;
}
