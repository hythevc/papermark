import { useTeam } from "@/context/team-context";
import useSWRImmutable from "swr/immutable";

import {
  SlackIntegrationResponse,
  decodeSlackIntegration,
} from "@/lib/integrations/slack/status";
import { fetcher } from "@/lib/utils";

export function useSlackIntegration({ enabled = true }: { enabled?: boolean }) {
  const { currentTeamId: teamId } = useTeam();
  const { data, error, isLoading, mutate } =
    useSWRImmutable<SlackIntegrationResponse>(
      enabled && teamId ? `/api/teams/${teamId}/integrations/slack` : null,
      fetcher,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 30000,
        revalidateIfStale: false,
        errorRetryCount: 2,
        errorRetryInterval: 5000,
      },
    );

  const state = decodeSlackIntegration(data, error?.status);
  return {
    ...state,
    error,
    loading: isLoading && !data,
    mutate,
  };
}
