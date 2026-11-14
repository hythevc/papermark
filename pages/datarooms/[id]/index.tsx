import Link from "next/link";

import {
  ArrowUpRightIcon,
  FileTextIcon,
  LinkIcon,
  UsersIcon,
} from "lucide-react";

import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import {
  useDataroom,
  useDataroomDocuments,
  useDataroomFoldersTree,
  useDataroomLinks,
} from "@/lib/swr/use-dataroom";
import { useDataroomStats } from "@/lib/swr/use-dataroom-stats";
import { LinkWithViews } from "@/lib/types";

import StatsCard from "@/components/datarooms/stats-card";
import AppLayout from "@/components/layouts/app";
import LinksTable from "@/components/links/links-table";
import DataroomVisitorsTable from "@/components/visitors/dataroom-visitors-table";

function RoomNextSteps({
  dataroomId,
  isFrozen,
  links,
  linksError,
  role,
}: {
  dataroomId: string;
  isFrozen: boolean;
  links: LinkWithViews[] | undefined;
  linksError: unknown;
  role: string;
}) {
  const { documents, error: documentsError } = useDataroomDocuments();
  const { folders, error: foldersError } = useDataroomFoldersTree({
    dataroomId,
  });
  const { stats, error: statsError } = useDataroomStats();
  // The documents endpoint returns root files; each folder in the flat folder
  // response supplies its own files. Ignore nested copies in childFolders.
  const documentCount =
    documents && folders
      ? documents.length +
        folders.reduce((count, folder) => count + folder.documents.length, 0)
      : undefined;
  const activeLinkCount = links?.filter(
    (link) =>
      !link.isArchived &&
      (!link.expiresAt || new Date(link.expiresAt).getTime() > Date.now()),
  ).length;
  const steps = [
    {
      title: isFrozen ? "Review documents" : "Add documents",
      href: `/datarooms/${dataroomId}/documents`,
      icon: FileTextIcon,
      visible: hasAllPermissions(role, ["datarooms.read"]),
      status:
        documentsError || foldersError
          ? "Document count unavailable"
          : documentCount === undefined
            ? "Loading document count…"
            : `${documentCount} ${documentCount === 1 ? "document" : "documents"} in this room`,
      description: "Keep the materials for your next conversation together.",
    },
    {
      title: "Review sharing",
      href: `/datarooms/${dataroomId}/permissions`,
      icon: LinkIcon,
      visible: hasAllPermissions(role, ["links.read"]),
      status: isFrozen
        ? "Sharing paused while room is frozen"
        : linksError
          ? "Sharing status unavailable"
          : activeLinkCount === undefined
            ? "Loading sharing status…"
            : `${activeLinkCount} active ${activeLinkCount === 1 ? "link" : "links"}`,
      description: "Check who can enter and what they can see before sharing.",
    },
    {
      title: "Check visitor activity",
      href: `/datarooms/${dataroomId}/analytics`,
      icon: UsersIcon,
      visible: hasAllPermissions(role, ["analytics.read"]),
      status: statsError
        ? "Visitor activity unavailable"
        : !stats
          ? "Loading visitor activity…"
          : `${stats.dataroomViews.length} room ${stats.dataroomViews.length === 1 ? "visit" : "visits"}`,
      description: "Use actual engagement to give your follow-up context.",
    },
  ].filter((step) => step.visible);

  if (steps.length === 0) return null;

  return (
    <section
      aria-labelledby="room-next-steps"
      className="rounded-xl border border-emerald-900/15 bg-emerald-50/40 p-4 dark:border-emerald-300/15 dark:bg-emerald-950/15 sm:p-5"
    >
      <div className="mb-4 space-y-1">
        <h4 id="room-next-steps" className="font-semibold text-foreground">
          A clear next step for your room
        </h4>
        <p className="text-sm text-muted-foreground">
          Organize the materials, review access, then follow the engagement.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="group flex min-w-0 flex-col gap-3 rounded-lg border border-emerald-900/10 bg-background p-4 transition-colors hover:border-emerald-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:border-emerald-300/15"
          >
            <div className="flex items-center justify-between gap-2">
              <step.icon
                aria-hidden="true"
                className="h-5 w-5 text-emerald-800 dark:text-emerald-300"
              />
              <ArrowUpRightIcon
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-emerald-800 dark:group-hover:text-emerald-300"
              />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold">{step.title}</h5>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                {step.status}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DataroomPage() {
  const { dataroom } = useDataroom();
  const { links, error: linksError } = useDataroomLinks();
  const { role, isDataroomMember, allowedDataroomIds, loading } =
    useSelfMembership();

  if (!dataroom) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">
            Overview
          </h3>
        </div>

        {!loading &&
          role &&
          (!isDataroomMember || allowedDataroomIds.includes(dataroom.id)) && (
            <RoomNextSteps
              dataroomId={dataroom.id}
              isFrozen={dataroom.isFrozen}
              links={links}
              linksError={linksError}
              role={role}
            />
          )}

        <div className="space-y-4">
          <StatsCard />

          <LinksTable
            links={links}
            targetType={"DATAROOM"}
            dataroomName={dataroom.name}
          />

          <DataroomVisitorsTable dataroomId={dataroom.id} />
        </div>
      </div>
    </AppLayout>
  );
}
