import { useRouter } from "next/router";

import { useEffect, useMemo, useState } from "react";

import { useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  EyeIcon,
  FileTextIcon,
  FolderLockIcon,
  Link2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useQueryState } from "nuqs";

import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import { usePlan } from "@/lib/swr/use-billing";
import useDatarooms from "@/lib/swr/use-datarooms";
import useLimits from "@/lib/swr/use-limits";
import { useTags } from "@/lib/swr/use-tags";
import { daysLeft } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { AddDataroomModal } from "@/components/datarooms/add-dataroom-modal";
import DataroomCard from "@/components/datarooms/dataroom-card";
import { DataroomTrialModal } from "@/components/datarooms/dataroom-trial-modal";
import AppLayout from "@/components/layouts/app";
import { SearchBoxPersisted } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select-v2";

export default function DataroomsPage() {
  const teamInfo = useTeam();
  const { datarooms, totalCount, loading, error, mutate } = useDatarooms();
  const {
    isFree,
    isPro,
    isBusiness,
    isDatarooms,
    isDataroomsPlus,
    isTrial,
    trialEndsAt,
  } = usePlan();
  const { limits } = useLimits();
  const router = useRouter();

  // Dataroom-scoped members cannot create datarooms; hide the creation controls.
  const { isDataroomMember } = useSelfMembership();

  const [tagsFilter, setTagsFilter] = useQueryState<string[]>("tags", {
    parse: (value: string) => value.split(",").filter(Boolean),
    serialize: (value: string[]) => value.join(","),
  });
  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);

  const { tags: availableTags } = useTags({
    query: {
      sortBy: "name",
      sortOrder: "asc",
    },
  });

  const totalDatarooms = totalCount ?? 0;
  const limitDatarooms = limits?.datarooms ?? 1;

  const canCreateUnlimitedDatarooms =
    isDatarooms ||
    isDataroomsPlus ||
    (isBusiness && totalDatarooms < limitDatarooms);

  const searchQuery = router.query.search as string | undefined;

  const [sortOrder, setSortOrder] = useState("newest");
  const sortedDatarooms = useMemo(() => {
    return datarooms?.slice().sort((a, b) => {
      if (sortOrder === "name") return a.name.localeCompare(b.name);
      if (sortOrder === "activity") {
        const activityDifference =
          (b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0) -
          (a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0);
        if (activityDifference !== 0) return activityDifference;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [datarooms, sortOrder]);

  const summary = useMemo(
    () => ({
      rooms: datarooms?.length ?? 0,
      shared:
        datarooms?.filter(
          (room) =>
            room.activeLinkCount > 0 &&
            !room.isFrozen,
        ).length ?? 0,
      documents:
        datarooms?.reduce((total, room) => total + room._count.documents, 0) ??
        0,
      views:
        datarooms?.reduce((total, room) => total + room._count.views, 0) ?? 0,
    }),
    [datarooms],
  );

  const selectedTagValues = useMemo(() => {
    return tagsFilter || [];
  }, [tagsFilter]);

  // Only surface tags that are actually applied to a dataroom the user can see.
  // Team tags that aren't attached to any visible dataroom would never match a
  // filter, so showing them is just noise (and leaks unrelated tags to
  // dataroom-scoped members). Selected tags are always kept so an active filter
  // doesn't vanish when it narrows the result set.
  const visibleTagNames = useMemo(() => {
    const names = new Set<string>(selectedTagValues);
    (datarooms ?? []).forEach((dataroom) => {
      dataroom.tags?.forEach((tagItem) => names.add(tagItem.tag.name));
    });
    return names;
  }, [datarooms, selectedTagValues]);

  const tagOptions = useMemo(() => {
    return (availableTags ?? [])
      .filter((tag) => visibleTagNames.has(tag.name))
      .map((tag) => ({
        value: tag.name,
        label: tag.name,
        meta: { color: tag.color, description: tag.description },
      }));
  }, [availableTags, visibleTagNames]);

  const hasActiveFilters = Boolean(searchQuery || tagsFilter?.length);

  const clearFilters = () => {
    const query = { ...router.query };
    delete query.search;
    delete query.tags;
    router.push({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  };

  useEffect(() => {
    if (!isTrial && (isFree || isPro)) router.push("/documents");
  }, [isTrial, isFree, isPro, router]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        <section className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-400">
              Your workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Data rooms
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Keep your documents organized, your access deliberate, and your
              next deal moving.
            </p>
          </div>
          <div className="flex items-center gap-x-1">
            {isDataroomMember ? null : isBusiness &&
              !canCreateUnlimitedDatarooms ? (
              <UpgradePlanModal
                clickedPlan={PlanEnum.DataRooms}
                trigger="datarooms"
              >
                <Button
                  className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-2 text-left sm:gap-x-3 sm:px-3"
                  title="Upgrade to Add Data Room"
                >
                  <span className="text-xs sm:text-sm">
                    Upgrade to Add Data Room
                  </span>
                </Button>
              </UpgradePlanModal>
            ) : isTrial &&
              datarooms &&
              !isBusiness &&
              !isDatarooms &&
              !isDataroomsPlus ? (
              <div className="flex items-center gap-x-2 sm:gap-x-4">
                <div className="text-xs text-destructive sm:text-sm">
                  <span>Trial: </span>
                  <span className="font-medium">
                    {(() => {
                      let days: number;
                      if (trialEndsAt) {
                        days = daysLeft(new Date(trialEndsAt), 0);
                      } else {
                        const startDate =
                          datarooms && datarooms.length > 0
                            ? datarooms[datarooms.length - 1]?.createdAt
                            : new Date(
                                teamInfo?.currentTeam?.createdAt ?? Date.now(),
                              );
                        days = daysLeft(new Date(startDate), 7);
                      }
                      if (days <= 0) return "Expired";
                      const label = days === 1 ? "day" : "days";
                      return `${days} ${label} left`;
                    })()}
                  </span>
                </div>
                {totalDatarooms < limitDatarooms ? (
                  <AddDataroomModal>
                    <Button
                      className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-2 text-left sm:gap-x-3 sm:px-3"
                      title="Create a data room"
                    >
                      <PlusIcon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-xs sm:text-sm">New data room</span>
                    </Button>
                  </AddDataroomModal>
                ) : (
                  <UpgradePlanModal
                    clickedPlan={PlanEnum.DataRooms}
                    trigger="datarooms"
                  >
                    <Button
                      className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-2 text-left sm:gap-x-3 sm:px-3"
                      title="Upgrade to Add Data Room"
                    >
                      <span className="text-xs sm:text-sm">Upgrade</span>
                    </Button>
                  </UpgradePlanModal>
                )}
              </div>
            ) : isBusiness || isDatarooms || isDataroomsPlus ? (
              <AddDataroomModal>
                <Button
                  className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-2 text-left sm:gap-x-3 sm:px-3"
                  title="Create a data room"
                >
                  <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="text-xs sm:text-sm">New data room</span>
                </Button>
              </AddDataroomModal>
            ) : (
              <DataroomTrialModal>
                <Button
                  className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-2 text-left sm:gap-x-3 sm:px-3"
                  title="Start Data Room Trial"
                >
                  <span className="text-xs sm:text-sm">Start Trial</span>
                </Button>
              </DataroomTrialModal>
            )}
          </div>
        </section>
        <section
          aria-label={
            hasActiveFilters ? "Summary of matching rooms" : "Room summary"
          }
          className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {[
            {
              label: hasActiveFilters ? "Matching rooms" : "Total rooms",
              value: summary.rooms,
              icon: FolderLockIcon,
            },
            { label: "Shared rooms", value: summary.shared, icon: Link2Icon },
            {
              label: "Documents",
              value: summary.documents,
              icon: FileTextIcon,
            },
            { label: "Room views", value: summary.views, icon: EyeIcon },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs sm:text-sm">{label}</span>
                <Icon
                  className="h-4 w-4 text-emerald-800 dark:text-emerald-400"
                  aria-hidden="true"
                />
              </div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading || error ? "—" : value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasActiveFilters ? "In matching rooms" : "Across your rooms"}
              </p>
            </div>
          ))}
        </section>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center">
          <div
            role="search"
            aria-label="Search data rooms"
            className="min-w-0 flex-1"
          >
            <SearchBoxPersisted
              placeholder="Search data rooms…"
              inputClassName="h-10 text-sm"
            />
          </div>
          <div className="w-full lg:w-56">
            <MultiSelect
              options={tagOptions}
              value={selectedTagValues}
              onValueChange={(value) =>
                setTagsFilter(value.length > 0 ? value : null)
              }
              placeholder="Filter by tag"
              maxCount={2}
              searchPlaceholder="Search tags…"
              isPopoverOpen={isTagsPopoverOpen}
              setIsPopoverOpen={setIsTagsPopoverOpen}
              popoverClassName="sm:w-[320px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="room-sort"
              className="shrink-0 text-xs text-muted-foreground"
            >
              Sort by
            </label>
            <select
              id="room-sort"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-40"
            >
              <option value="newest">Newest first</option>
              <option value="activity">Recently viewed</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && !loading && !error && (
          <div
            className="mb-5 flex items-center gap-3 text-sm text-muted-foreground"
            role="status"
          >
            <span>
              Showing {sortedDatarooms?.length ?? 0} of {totalDatarooms} rooms
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        )}

        {error ? (
          <div
            role="alert"
            className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-14 text-center"
          >
            <AlertCircleIcon
              className="mb-4 h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">
              We couldn’t load your rooms
            </h2>
            <p className="mb-5 mt-2 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Loading data rooms">
            <span className="sr-only">Loading data rooms…</span>
            <div
              className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3"
              aria-hidden="true"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-xl border border-border bg-muted/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        ) : sortedDatarooms?.length ? (
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {sortedDatarooms.map((dataroom) => (
              <li key={dataroom.id}>
                <DataroomCard dataroom={dataroom} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              {hasActiveFilters ? (
                <SearchIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FolderLockIcon className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              {hasActiveFilters
                ? "No rooms match your search"
                : "Your next deal starts here"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {hasActiveFilters
                ? "Try another name or clear your filters to see all your rooms."
                : isDataroomMember
                  ? "Rooms assigned to you will appear here. Ask your workspace administrator for access."
                  : "Create a room, add your documents, then choose exactly how to share them. Use the create button above to get started."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-5" onClick={clearFilters}>
                Clear filters{" "}
                <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
