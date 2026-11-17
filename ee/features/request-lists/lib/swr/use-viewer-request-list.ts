import useSWR from "swr";

import { fetcher } from "@/lib/utils";

import type { ViewerRequestListResponse } from "../types";

export function useViewerRequestList({
  linkId,
  dataroomId,
  viewerId,
  isPreview = false,
}: {
  linkId?: string | null;
  dataroomId?: string | null;
  viewerId?: string | null;
  isPreview?: boolean;
}) {
  const url =
    linkId && dataroomId && viewerId && !isPreview
      ? `/api/links/${encodeURIComponent(linkId)}/request-list?dataroomId=${encodeURIComponent(dataroomId)}`
      : null;
  const { data, error, isLoading, mutate } = useSWR<ViewerRequestListResponse>(
    url,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 15000 },
  );
  return {
    enabled: data?.enabled ?? false,
    readOnly: data?.readOnly ?? false,
    list: data?.list ?? null,
    tasks: data?.tasks ?? [],
    teamId: data?.teamId,
    loading: isLoading,
    error,
    mutate,
    url,
  };
}
