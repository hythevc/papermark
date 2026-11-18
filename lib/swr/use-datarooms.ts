import { useRouter } from "next/router";

import { useTeam } from "@/context/team-context";
import { Dataroom } from "@prisma/client";
import useSWR from "swr";

import { fetcher } from "@/lib/utils";

export type DataroomWithCount = Pick<Dataroom, "id" | "name" | "createdAt"> & {
  _count: {
    documents: number;
    views: number;
  };
  activeLinkCount: number;
  isFrozen?: boolean;
  internalName?: string | null;
  lastViewedAt: Date | null;
  tags?: {
    tag: {
      id: string;
      name: string;
      color: string;
      description: string | null;
    };
  }[];
};

export type DataroomsResponse = {
  datarooms: DataroomWithCount[];
  totalCount: number;
};

export default function useDatarooms() {
  const router = useRouter();
  const teamInfo = useTeam();

  const queryParams = router.query;
  const searchQuery = queryParams["search"];
  const statusQuery = queryParams["status"];
  const tagsQuery = queryParams["tags"];

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    search: searchQuery,
    status: statusQuery,
    tags: tagsQuery,
  })) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  const queryString = params.size > 0 ? `?${params.toString()}` : "";

  const { data, error, mutate } = useSWR<DataroomsResponse>(
    teamInfo?.currentTeam?.id &&
      `/api/teams/${teamInfo?.currentTeam?.id}/datarooms${queryString}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    },
  );

  return {
    datarooms: data?.datarooms,
    totalCount: data?.totalCount,
    loading: !data && !error,
    error,
    mutate,
  };
}
