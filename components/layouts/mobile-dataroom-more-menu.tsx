"use client";

import Link from "next/link";
import { useRouter } from "next/router";

import { useEffect, useRef, useState } from "react";

import { useRequestListFeatureEnabled } from "@/ee/features/request-lists/lib/use-request-list-feature";
import { PlanEnum } from "@/ee/stripe/constants";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3Icon,
  BrushIcon,
  ChevronDownIcon,
  CogIcon,
  ContactIcon,
  HouseIcon,
  LayoutDashboardIcon,
  LinkIcon,
  ListChecksIcon,
  LogsIcon,
  MessagesSquareIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import {
  matchesNavigationPath,
  roomMobileSection,
} from "@/lib/navigation/mobile-navigation";
import { usePlan } from "@/lib/swr/use-billing";
import { useDataroom } from "@/lib/swr/use-dataroom";
import useLimits from "@/lib/swr/use-limits";
import { cn } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { DataroomLinkSheet } from "@/components/links/link-sheet/dataroom-link-sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface MobileDataroomMoreMenuProps {
  open: boolean;
  onClose: () => void;
  dataroomId: string;
}

export function MobileDataroomMoreMenu({
  open,
  onClose,
  dataroomId,
}: MobileDataroomMoreMenuProps) {
  const router = useRouter();
  const { isTrial } = usePlan();
  const { limits } = useLimits();
  const { dataroom } = useDataroom(dataroomId);
  const { role, isDataroomMember, allowedDataroomIds, loading } =
    useSelfMembership();
  const isRequestListFeatureEnabled = useRequestListFeatureEnabled();
  const section = roomMobileSection(router.pathname);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const canView =
    !loading &&
    !!role &&
    hasAllPermissions(role, ["datarooms.read"]) &&
    (!isDataroomMember || allowedDataroomIds.includes(dataroomId));
  const canShare =
    canView &&
    !!role &&
    hasAllPermissions(role, ["links.write"]) &&
    dataroom?.id === dataroomId &&
    !dataroom.isFrozen;
  const canReadLinks =
    canView && !!role && hasAllPermissions(role, ["links.read"]);
  const canReadAnalytics =
    canView && !!role && hasAllPermissions(role, ["analytics.read"]);

  useEffect(() => {
    if (!open) return;
    setPermissionsExpanded(section === "permissions");
    setAnalyticsExpanded(section === "analytics");
    setSettingsExpanded(
      matchesNavigationPath(router.pathname, "/datarooms/[id]/settings"),
    );
  }, [open, router.pathname, section]);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) onClose();
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open, onClose]);

  useEffect(() => {
    if (!canShare) setLinkSheetOpen(false);
  }, [canShare]);

  const base = `/datarooms/${dataroomId}`;
  const active = (href: string, exact = false) =>
    matchesNavigationPath(router.asPath, href, exact);
  const current = (href: string, exact = false) =>
    active(href, exact) ? ("page" as const) : undefined;
  const rowClass = (selected: boolean) =>
    cn(
      "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );
  const subLinkClass = (href: string, exact = false) =>
    cn(
      "flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active(href, exact)
        ? "font-medium text-primary"
        : "text-muted-foreground hover:text-foreground",
    );
  const settingsSubItems = [
    { label: "General", href: `${base}/settings` },
    { label: "Introduction", href: `${base}/settings/introduction` },
    { label: "Notifications", href: `${base}/settings/notifications` },
    { label: "Downloads", href: `${base}/settings/downloads` },
    { label: "File permissions", href: `${base}/settings/file-permissions` },
  ];

  return (
    <>
      <DialogPrimitive.Root
        open={open && canView}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 md:hidden" />
          <DialogPrimitive.Content
            id="room-mobile-menu"
            className="fixed inset-0 z-50 flex h-[100dvh] touch-manipulation flex-col bg-background pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] outline-none [-webkit-tap-highlight-color:transparent] md:hidden"
            onOpenAutoFocus={() => {
              returnFocusRef.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (!document.querySelector('[role="dialog"][data-state="open"]'))
                returnFocusRef.current?.focus();
            }}
          >
            <DialogPrimitive.Description className="sr-only">
              Data room overview, access, activity, and settings.
            </DialogPrimitive.Description>
            <div className="flex h-[var(--app-mobile-header-height,3.5rem)] shrink-0 items-center justify-between border-b border-border px-4">
              <DialogPrimitive.Title className="text-lg font-semibold">
                Data room menu
              </DialogPrimitive.Title>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close data room menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
              <nav className="space-y-1" aria-label="Data room destinations">
                {canShare ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mb-3 min-h-11 w-full"
                    onClick={() => {
                      onClose();
                      setLinkSheetOpen(true);
                    }}
                  >
                    Share data room
                  </Button>
                ) : dataroom?.isFrozen ? (
                  <p className="mb-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Sharing is paused while this room is frozen.
                  </p>
                ) : null}
                {!isDataroomMember &&
                  !!role &&
                  hasAllPermissions(role, ["analytics.team"]) && (
                    <Link
                      href="/dashboard"
                      onClick={onClose}
                      className={rowClass(false)}
                    >
                      <HouseIcon className="h-5 w-5" aria-hidden="true" />
                      Workspace dashboard
                    </Link>
                  )}
                <Link
                  href="/datarooms"
                  onClick={onClose}
                  className={rowClass(false)}
                >
                  <ServerIcon className="h-5 w-5" aria-hidden="true" />
                  All data rooms
                </Link>
                <Separator className="my-3" />
                <Link
                  href={base}
                  onClick={onClose}
                  aria-current={current(base, true)}
                  className={rowClass(active(base, true))}
                >
                  <LayoutDashboardIcon className="h-5 w-5" aria-hidden="true" />
                  Room overview
                </Link>
                {canReadLinks && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={permissionsExpanded}
                      aria-controls="room-permission-links"
                      onClick={() => setPermissionsExpanded((v) => !v)}
                      className={rowClass(section === "permissions")}
                    >
                      <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
                      Sharing
                      <ChevronDownIcon
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          permissionsExpanded && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {permissionsExpanded && (
                      <div
                        id="room-permission-links"
                        className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3"
                      >
                        <Link
                          href={`${base}/permissions`}
                          aria-current={current(`${base}/permissions`)}
                          onClick={onClose}
                          className={subLinkClass(`${base}/permissions`)}
                        >
                          <span className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" aria-hidden="true" />
                            Access links
                          </span>
                        </Link>
                        <Link
                          href={`${base}/groups`}
                          aria-current={current(`${base}/groups`)}
                          onClick={onClose}
                          className={subLinkClass(`${base}/groups`)}
                        >
                          <span className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4" aria-hidden="true" />
                            Groups
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {canReadAnalytics && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={analyticsExpanded}
                      aria-controls="room-analytics-links"
                      onClick={() => setAnalyticsExpanded((v) => !v)}
                      className={rowClass(section === "analytics")}
                    >
                      <BarChart3Icon className="h-5 w-5" aria-hidden="true" />
                      Analytics
                      <ChevronDownIcon
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          analyticsExpanded && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {analyticsExpanded && (
                      <div
                        id="room-analytics-links"
                        className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3"
                      >
                        <Link
                          href={`${base}/analytics`}
                          aria-current={current(`${base}/analytics`, true)}
                          onClick={onClose}
                          className={subLinkClass(`${base}/analytics`, true)}
                        >
                          <span className="flex items-center gap-2">
                            <BarChart3Icon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Engagement overview
                          </span>
                        </Link>
                        <Link
                          href={`${base}/analytics/audit-log`}
                          aria-current={current(`${base}/analytics/audit-log`)}
                          onClick={onClose}
                          className={subLinkClass(
                            `${base}/analytics/audit-log`,
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <LogsIcon className="h-4 w-4" aria-hidden="true" />
                            Audit log
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <Separator className="my-3" />
                {!limits?.conversationsInDataroom ? (
                  <UpgradePlanModal
                    clickedPlan={PlanEnum.DataRoomsPlus}
                    trigger="mobile_dataroom_more_qa"
                    highlightItem={["qa"]}
                  >
                    <button type="button" className={rowClass(false)}>
                      <MessagesSquareIcon
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                      Q&A
                    </button>
                  </UpgradePlanModal>
                ) : (
                  <Link
                    href={`${base}/conversations`}
                    aria-current={current(`${base}/conversations`)}
                    onClick={onClose}
                    className={rowClass(active(`${base}/conversations`))}
                  >
                    <MessagesSquareIcon
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                    Q&A
                  </Link>
                )}
                {isRequestListFeatureEnabled &&
                  dataroom?.requestListEnabled && (
                    <Link
                      href={`${base}/tasks`}
                      aria-current={current(`${base}/tasks`)}
                      onClick={onClose}
                      className={rowClass(active(`${base}/tasks`))}
                    >
                      <ListChecksIcon className="h-5 w-5" aria-hidden="true" />
                      Request list
                    </Link>
                  )}
                {canReadAnalytics && (
                  <Link
                    href={`${base}/users`}
                    aria-current={current(`${base}/users`)}
                    onClick={onClose}
                    className={rowClass(active(`${base}/users`))}
                  >
                    <ContactIcon className="h-5 w-5" aria-hidden="true" />
                    Visitors
                  </Link>
                )}
                {!!role && hasAllPermissions(role, ["branding.read"]) && (
                  <Link
                    href={`${base}/branding`}
                    aria-current={current(`${base}/branding`)}
                    onClick={onClose}
                    className={rowClass(active(`${base}/branding`))}
                  >
                    <BrushIcon className="h-5 w-5" aria-hidden="true" />
                    Branding
                  </Link>
                )}
                <div>
                  <button
                    type="button"
                    aria-expanded={settingsExpanded}
                    aria-controls="room-settings-links"
                    onClick={() => setSettingsExpanded((v) => !v)}
                    className={rowClass(active(`${base}/settings`))}
                  >
                    <CogIcon className="h-5 w-5" aria-hidden="true" />
                    Settings
                    <ChevronDownIcon
                      className={cn(
                        "ml-auto h-4 w-4 transition-transform",
                        settingsExpanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {settingsExpanded && (
                    <div
                      id="room-settings-links"
                      className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3"
                    >
                      {settingsSubItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          aria-current={current(sub.href, true)}
                          onClick={onClose}
                          className={subLinkClass(sub.href, true)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {isTrial && !isDataroomMember && (
                  <Link
                    href="/settings/billing"
                    onClick={onClose}
                    className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Upgrade plan
                  </Link>
                )}
              </nav>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      {canShare && (
        <DataroomLinkSheet
          isOpen={linkSheetOpen}
          setIsOpen={setLinkSheetOpen}
          linkType="DATAROOM_LINK"
          linkTargetId={dataroomId}
        />
      )}
    </>
  );
}
