import Link from "next/link";
import { useRouter } from "next/router";

import { useState } from "react";

import { PlanEnum } from "@/ee/stripe/constants";
import {
  BarChart3Icon,
  FolderIcon,
  HouseIcon,
  MoreHorizontalIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import {
  roomMobileSection,
  workspaceMobileSection,
} from "@/lib/navigation/mobile-navigation";
import { usePlan } from "@/lib/swr/use-billing";
import { useDataroom } from "@/lib/swr/use-dataroom";
import { cn } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";

import { MobileDataroomMoreMenu } from "./mobile-dataroom-more-menu";
import { MobileMoreMenu } from "./mobile-more-menu";
import { MobileShareFab } from "./mobile-share-fab";

const navClass =
  "fixed inset-x-0 bottom-0 z-50 touch-manipulation border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] [-webkit-tap-highlight-color:transparent] md:hidden";
const rowClass =
  "flex min-h-[var(--app-mobile-nav-height,4.5rem)] items-center justify-between gap-0.5 px-0.5";

export function MobileBottomNav() {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isBusiness, isDatarooms, isDataroomsPlus, isTrial } = usePlan();
  const { role, isDataroomMember, allowedDataroomIds, loading } =
    useSelfMembership();
  const { dataroom } = useDataroom();
  const dataroomsEnabled =
    isBusiness || isDatarooms || isDataroomsPlus || isTrial;
  const dataroomId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const inDataroomDetail =
    router.pathname.startsWith("/datarooms/[id]") && !!dataroomId;
  const workspaceSection = workspaceMobileSection(router.pathname);
  const roomSection = roomMobileSection(router.pathname);
  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
    );

  // Until membership resolves, do not flash team-wide destinations or actions.
  if (loading || !role) {
    return (
      <nav
        aria-label="Workspace navigation"
        aria-busy={loading}
        className={navClass}
      >
        <div className={`${rowClass} justify-center`}>
          <p role="status" className="text-xs text-muted-foreground">
            {loading
              ? "Loading navigation…"
              : "Workspace navigation unavailable"}
          </p>
        </div>
      </nav>
    );
  }

  if (inDataroomDetail && dataroomId) {
    if (
      !hasAllPermissions(role, ["datarooms.read"]) ||
      (isDataroomMember && !allowedDataroomIds.includes(dataroomId))
    )
      return null;
    const base = `/datarooms/${dataroomId}`;
    const canShare =
      hasAllPermissions(role, ["links.write"]) &&
      dataroom?.id === dataroomId &&
      !dataroom.isFrozen;
    return (
      <>
        <nav aria-label="Data room navigation" className={navClass}>
          <div className={rowClass}>
            <Link
              href={`${base}/documents`}
              aria-current={roomSection === "documents" ? "page" : undefined}
              className={tabClass(roomSection === "documents")}
            >
              <FolderIcon className="h-6 w-6" aria-hidden="true" />
              <span>Documents</span>
            </Link>
            <Link
              href={`${base}/permissions`}
              aria-current={roomSection === "permissions" ? "page" : undefined}
              className={tabClass(roomSection === "permissions")}
            >
              <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
              <span>Sharing</span>
            </Link>
            <div className="flex w-12 shrink-0 items-center justify-center">
              {canShare ? (
                <MobileShareFab mode="dataroom" dataroomId={dataroomId} />
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={
                    dataroom?.isFrozen
                      ? "Sharing is paused for this frozen room"
                      : "Sharing is unavailable"
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
                >
                  <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
            <Link
              href={`${base}/analytics`}
              aria-current={roomSection === "analytics" ? "page" : undefined}
              className={tabClass(roomSection === "analytics")}
            >
              <BarChart3Icon className="h-6 w-6" aria-hidden="true" />
              <span>Analytics</span>
            </Link>
            <button
              type="button"
              aria-label="Open data room menu"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="room-mobile-menu"
              onClick={() => setMoreOpen(true)}
              className={tabClass(
                roomSection === "more" || roomSection === "overview",
              )}
            >
              <MoreHorizontalIcon className="h-6 w-6" aria-hidden="true" />
              <span>More</span>
            </button>
          </div>
        </nav>
        <MobileDataroomMoreMenu
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          dataroomId={dataroomId}
        />
      </>
    );
  }

  if (isDataroomMember) {
    return (
      <>
        <nav aria-label="Workspace navigation" className={navClass}>
          <div className={rowClass}>
            <Link
              href="/datarooms"
              aria-current={
                workspaceSection === "datarooms" ? "page" : undefined
              }
              className={tabClass(workspaceSection === "datarooms")}
            >
              <ServerIcon className="h-6 w-6" aria-hidden="true" />
              <span>Data rooms</span>
            </Link>
            <button
              type="button"
              aria-label="Open workspace menu"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls="workspace-mobile-menu"
              onClick={() => setMoreOpen(true)}
              className={tabClass(workspaceSection !== "datarooms")}
            >
              <MoreHorizontalIcon className="h-6 w-6" aria-hidden="true" />
              <span>More</span>
            </button>
          </div>
        </nav>
        <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      </>
    );
  }

  return (
    <>
      <nav aria-label="Workspace navigation" className={navClass}>
        <div className={rowClass}>
          <Link
            href="/dashboard"
            aria-current={workspaceSection === "dashboard" ? "page" : undefined}
            className={tabClass(workspaceSection === "dashboard")}
          >
            <HouseIcon className="h-6 w-6" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/documents"
            aria-current={workspaceSection === "documents" ? "page" : undefined}
            className={tabClass(workspaceSection === "documents")}
          >
            <FolderIcon className="h-6 w-6" aria-hidden="true" />
            <span>Documents</span>
          </Link>
          <div className="flex w-12 shrink-0 items-center justify-center">
            {hasAllPermissions(role, ["links.write"]) && (
              <MobileShareFab mode="global" />
            )}
          </div>
          {dataroomsEnabled ? (
            <Link
              href="/datarooms"
              aria-current={
                workspaceSection === "datarooms" ? "page" : undefined
              }
              className={tabClass(workspaceSection === "datarooms")}
            >
              <ServerIcon className="h-6 w-6" aria-hidden="true" />
              <span>Data rooms</span>
            </Link>
          ) : (
            <UpgradePlanModal
              clickedPlan={PlanEnum.Business}
              trigger="mobile_nav_datarooms"
              highlightItem={["datarooms"]}
            >
              <button
                type="button"
                className={tabClass(false)}
                aria-label="Upgrade to use data rooms"
              >
                <ServerIcon className="h-6 w-6" aria-hidden="true" />
                <span>Data rooms</span>
              </button>
            </UpgradePlanModal>
          )}
          <button
            type="button"
            aria-label="Open workspace menu"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls="workspace-mobile-menu"
            onClick={() => setMoreOpen(true)}
            className={tabClass(workspaceSection === "more")}
          >
            <MoreHorizontalIcon className="h-6 w-6" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
