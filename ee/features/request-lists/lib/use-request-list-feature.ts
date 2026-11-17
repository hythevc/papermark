import { teamPlanIsDataroomPlusTier } from "@/lib/billing/team-plan-custom-messaging";
import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { usePlan } from "@/lib/swr/use-billing";

export function useRequestListFeatureEnabled(): boolean {
  const { plan } = usePlan();
  const { features } = useFeatureFlags();
  return teamPlanIsDataroomPlusTier(plan) || Boolean(features?.requestList);
}
