import { useMemo } from "react";

import { useTeam } from "@/context/team-context";
import { PLAN_NAME_MAP } from "@/ee/stripe/constants";
import useSWR from "swr";

import type { BillingPlanResponse } from "@/lib/billing/plan-response";
import { fetcher } from "@/lib/utils";

export type BasePlan =
  | "free"
  | "starter"
  | "pro"
  | "trial"
  | "business"
  | "datarooms"
  | "datarooms-plus"
  | "datarooms-premium"
  | "datarooms-unlimited";

interface PlanDetails {
  plan: BasePlan | null;
  trial: string | null;
  old: boolean;
}

function parsePlan(plan: string): PlanDetails {
  if (!plan || typeof plan !== "string") {
    return { plan: null, trial: null, old: false };
  }

  try {
    // Split the plan on '+'
    const parts = plan.split("+");
    return {
      plan: parts[0] as BasePlan, // Always the base plan
      trial: parts.includes("drtrial") ? "drtrial" : null, // 'drtrial' if present, otherwise null
      old: parts.includes("old"), // true if 'old' is present, otherwise false
    };
  } catch (error) {
    console.error("Error parsing plan:", error);
    return { plan: null, trial: null, old: false };
  }
}

export function usePlan({
  withDiscount = false,
}: { withDiscount?: boolean } = {}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const {
    data: plan,
    error,
    mutate,
  } = useSWR<BillingPlanResponse>(
    teamId
      ? `/api/teams/${teamId}/billing/plan${withDiscount ? "?withDiscount=true" : ""}`
      : null,
    fetcher,
  );

  // Parse the plan using the parsing function
  const parsedPlan = useMemo(() => {
    if (!plan || !plan.plan) {
      return { plan: null, trial: null, old: false };
    }
    return parsePlan(plan.plan);
  }, [plan]);

  return {
    plan: parsedPlan.plan ?? "free",
    planName: PLAN_NAME_MAP[parsedPlan.plan ?? "free"],
    originalPlan: plan?.plan ?? "free",
    trial: parsedPlan.trial,
    isTrial: !!parsedPlan.trial,
    isOldAccount: parsedPlan.old,
    isCustomer: plan?.isCustomer,
    isAnnualPlan: plan?.subscriptionCycle === "yearly",
    subscriptionCycle: plan?.subscriptionCycle ?? null,
    isSubscriptionCycleKnown: plan?.subscriptionCycle != null,
    billingProviderState: plan?.billingProviderState ?? null,
    billingProviderVerified: plan?.providerVerified ?? false,
    discountState: plan?.discountState ?? "unavailable",
    billingActionsAvailable: plan?.billingActionsAvailable === true,
    billingActionsReason: error
      ? "Billing availability could not be read. Try again later; no billing change has been made."
      : (plan?.billingActionsReason ?? "Checking billing availability…"),
    startsAt: plan?.startsAt,
    endsAt: plan?.endsAt,
    cancelledAt: plan?.cancelledAt,
    trialEndsAt: plan?.trialEndsAt ?? null,
    pausedAt: plan?.pausedAt,
    isPaused: plan?.isPaused ?? false,
    isCancelled: !!plan?.cancelledAt,
    pauseStartsAt: plan?.pauseStartsAt,
    pauseEndsAt: plan?.pauseEndsAt,
    discount: plan?.discount || null,
    isFree: parsedPlan.plan === "free",
    isStarter: parsedPlan.plan === "starter",
    isPro: parsedPlan.plan === "pro",
    isBusiness: parsedPlan.plan === "business",
    isDatarooms:
      parsedPlan.plan === "datarooms" ||
      parsedPlan.plan === "datarooms-plus" ||
      parsedPlan.plan === "datarooms-premium" ||
      parsedPlan.plan === "datarooms-unlimited",
    isDataroomsPlus:
      parsedPlan.plan === "datarooms-plus" ||
      parsedPlan.plan === "datarooms-premium" ||
      parsedPlan.plan === "datarooms-unlimited",
    isDataroomsPremium:
      parsedPlan.plan === "datarooms-premium" ||
      parsedPlan.plan === "datarooms-unlimited",
    isDataroomsUnlimited: parsedPlan.plan === "datarooms-unlimited",
    loading: !plan && !error && !!teamId, // Only show loading if we have a teamId but no data
    error,
    mutate,
  };
}
