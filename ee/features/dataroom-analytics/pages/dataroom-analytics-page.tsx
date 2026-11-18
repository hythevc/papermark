import { useState } from "react";

import { useDataroom } from "@/lib/swr/use-dataroom";
import { useDataroomStats } from "@/lib/swr/use-dataroom-stats";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataroomAnalyticsPage() {
  const [excludeTeamMembers, setExcludeTeamMembers] = useState(false);
  const { dataroom } = useDataroom();
  const { stats, error, loading, mutate } = useDataroomStats({
    excludeTeamMembers,
  });
  const visits = [...(stats?.dataroomViews ?? [])].sort(
    (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
  );
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {dataroom?.name ?? "Data room"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Room activity
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Recorded room and document views, across all time. A view is an
              activity signal; it does not confirm that a review is complete.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void mutate()}
            disabled={loading}
          >
            Refresh
          </Button>
        </header>
        <label className="flex min-h-11 w-fit items-center gap-3 text-sm">
          <Checkbox
            checked={excludeTeamMembers}
            onCheckedChange={(value) => setExcludeTeamMembers(value === true)}
          />
          Exclude workspace members
        </label>
        {error ? (
          <section
            role="alert"
            className="rounded-lg border border-destructive p-5"
          >
            <h2 className="font-medium">Activity could not load</h2>
            <p className="mt-2 text-sm">
              Check your connection and access, then try again.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void mutate()}
            >
              Try again
            </Button>
          </section>
        ) : loading ? (
          <div
            aria-label="Loading activity"
            role="status"
            className="grid gap-4 sm:grid-cols-3"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : stats ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                ["Room views", stats.dataroomViews.length.toLocaleString()],
                ["Document views", stats.documentViews.length.toLocaleString()],
                [
                  "Recorded reading time",
                  stats.total_duration === null
                    ? "Unavailable"
                    : `${Math.round(stats.total_duration / 60000).toLocaleString()} min`,
                ],
              ].map(([label, value]) => (
                <div className="rounded-lg border bg-card p-5" key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {!stats.durationAvailable && (
              <p className="text-sm text-muted-foreground">
                Reading-time analytics are not connected or are temporarily
                unavailable. The view counts above come from saved activity
                records.
              </p>
            )}
            <section
              aria-labelledby="room-visit-heading"
              className="rounded-lg border bg-card"
            >
              <h2
                id="room-visit-heading"
                className="border-b p-5 font-semibold"
              >
                Room visits
              </h2>
              {visits.length === 0 ? (
                <div className="p-6">
                  <h3 className="font-medium">
                    No room views in this selection
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Activity will appear after someone opens a sharing link.
                    Check your audience and sharing settings before sending it.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {visits.map((view) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-2 p-5"
                      key={view.id}
                    >
                      <span className="min-w-0 break-all text-sm font-medium">
                        {view.viewerEmail || "Anonymous visitor"}
                      </span>
                      <time
                        className="text-sm text-muted-foreground"
                        dateTime={new Date(view.viewedAt).toISOString()}
                      >
                        {new Date(view.viewedAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
