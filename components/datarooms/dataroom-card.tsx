"use client";

import Link from "next/link";

import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, FolderLockIcon, SnowflakeIcon } from "lucide-react";

import { TagColorProps } from "@/lib/types";
import { cn } from "@/lib/utils";

import TagBadge from "@/components/links/link-sheet/tags/tag-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type DataroomTag = {
  tag: {
    id: string;
    name: string;
    color: string;
    description: string | null;
  };
};

type DataroomWithDetails = {
  id: string;
  name: string;
  internalName?: string | null;
  isFrozen?: boolean;
  _count: {
    documents: number;
    views: number;
  };
  activeLinkCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  tags?: DataroomTag[];
};

interface DataroomCardProps {
  dataroom: DataroomWithDetails;
}

export default function DataroomCard({ dataroom }: DataroomCardProps) {
  const isShared = dataroom.activeLinkCount > 0 && !dataroom.isFrozen;
  const hasDocuments = dataroom._count.documents > 0;
  const roomName = dataroom.internalName || dataroom.name;
  const documentsHref = `/datarooms/${dataroom.id}/documents`;
  const nextAction = dataroom.isFrozen
    ? { label: "View room", href: documentsHref }
    : !hasDocuments
      ? { label: "Add documents", href: documentsHref }
      : !isShared
        ? {
            label: "Review sharing",
            href: `/datarooms/${dataroom.id}/permissions`,
          }
        : { label: "Open room", href: documentsHref };

  return (
    <Card className="group h-full overflow-hidden rounded-xl border-border bg-card shadow-none transition-colors hover:border-emerald-800/40 dark:hover:border-emerald-500/40">
      <CardHeader className="space-y-4 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-900/10 bg-emerald-50 text-emerald-900 dark:border-emerald-400/10 dark:bg-emerald-950 dark:text-emerald-300">
            <FolderLockIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              dataroom.isFrozen
                ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                : isShared
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-border bg-muted/40 text-muted-foreground",
            )}
            title={
              dataroom.isFrozen
                ? "This room is frozen and viewer access is revoked"
                : isShared
                  ? "This room has at least one active access link"
                  : "This room has no active access links"
            }
          >
            {dataroom.isFrozen ? (
              <SnowflakeIcon className="h-3 w-3" aria-hidden="true" />
            ) : (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isShared ? "bg-emerald-600" : "bg-muted-foreground",
                )}
                aria-hidden="true"
              />
            )}
            {dataroom.isFrozen ? "Frozen" : isShared ? "Shared" : "Not shared"}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug tracking-tight">
            <Link
              href={documentsHref}
              className="block truncate rounded-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={roomName}
            >
              {roomName}
            </Link>
          </h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {dataroom.internalName
              ? dataroom.name
              : `Created ${new Date(dataroom.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        </div>
        {dataroom.tags && dataroom.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dataroom.tags.slice(0, 3).map(({ tag }) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color as TagColorProps}
                className="text-xs"
              />
            ))}
            {dataroom.tags.length > 3 && (
              <span className="self-center text-xs text-muted-foreground">
                +{dataroom.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <dl className="mb-5 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 px-3 py-3">
          {[
            { label: "Documents", value: dataroom._count.documents },
            { label: "Views", value: dataroom._count.views },
            { label: "Active links", value: dataroom.activeLinkCount },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {dataroom.lastViewedAt ? (
              <>
                <span>Viewed </span>
                <time dateTime={new Date(dataroom.lastViewedAt).toISOString()}>
                  {formatDistanceToNow(new Date(dataroom.lastViewedAt), {
                    addSuffix: true,
                  })}
                </time>
              </>
            ) : (
              "No views yet"
            )}
          </p>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-emerald-900 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
          >
            <Link
              href={nextAction.href}
              aria-label={`${nextAction.label}: ${roomName}`}
            >
              {nextAction.label}
              <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
