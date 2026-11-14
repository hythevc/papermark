import Link from "next/link";
import { useRouter } from "next/router";

import { useEffect, useRef, useState } from "react";

import { useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BrushIcon,
  ChevronDownIcon,
  CogIcon,
  ContactIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";

import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import { BRAND } from "@/lib/brand";
import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import { matchesNavigationPath } from "@/lib/navigation/mobile-navigation";
import { usePlan } from "@/lib/swr/use-billing";
import useLimits from "@/lib/swr/use-limits";
import { useSlackIntegration } from "@/lib/swr/use-slack-integration";
import { Team } from "@/lib/types";
import { cn, nFormatter } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { Progress } from "@/components/ui/progress";

import { SlackIcon } from "../shared/icons/slack-icon";
import { MobileTeamSwitcher } from "./mobile-team-switcher";

interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ open, onClose }: MobileMoreMenuProps) {
  const router = useRouter();
  const { currentTeam, teams, setCurrentTeam } = useTeam() || {};
  const { isFree, isPro, isTrial } = usePlan();
  const { limits } = useLimits();
  const { isAdmin } = useIsAdmin();
  const { features } = useFeatureFlags();
  // Scoped members can't reach team-wide areas (visitors, branding, settings).
  const {
    role,
    isDataroomMember,
    loading: membershipLoading,
  } = useSelfMembership();
  const navigationReady = !membershipLoading && !!role;
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { integration: slackIntegration } = useSlackIntegration({
    enabled: !!currentTeam?.id,
  });
  const [settingsExpanded, setSettingsExpanded] = useState(() =>
    matchesNavigationPath(router.pathname, "/settings"),
  );

  const switchTeam = (team: Pick<Team, "id" | "name">) => {
    const target = teams?.find((t) => t.id === team.id);
    if (!target || target.id === currentTeam?.id) return;
    setCurrentTeam?.(target);
    onClose();
  };

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

  const linksLimit = limits?.links;
  const documentsLimit = limits?.documents;

  const settingsSubItems = [
    { label: "General", href: "/settings/general" },
    { label: "Team", href: "/settings/people" },
    { label: "Domains", href: "/settings/domains" },
    { label: "Notifications", href: "/settings/notifications" },
    { label: "Webhooks", href: "/settings/webhooks" },
    { label: "Slack", href: "/settings/slack" },
    ...(isAdmin ? [{ label: "Security", href: "/settings/security" }] : []),
    { label: "Billing", href: "/settings/billing" },
  ];

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 md:hidden" />
        <DialogPrimitive.Content
          id="workspace-mobile-menu"
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
            Workspace destinations, team switching, and settings.
          </DialogPrimitive.Description>
          <div className="flex h-[var(--app-mobile-header-height,3.5rem)] shrink-0 items-center justify-between border-b border-border px-4">
            <DialogPrimitive.Title className="text-lg font-semibold">
              Workspace menu
            </DialogPrimitive.Title>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close workspace menu"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
            {currentTeam && teams && teams.length > 0 && (
              <MobileTeamSwitcher
                currentTeam={currentTeam}
                teams={teams}
                onSwitch={switchTeam}
              />
            )}

            <nav className="space-y-1" aria-label="Workspace destinations">
              {!navigationReady && (
                <p
                  role="status"
                  className="px-3 py-4 text-sm text-muted-foreground"
                >
                  {membershipLoading
                    ? "Loading workspace navigation…"
                    : "Workspace navigation unavailable"}
                </p>
              )}
              {navigationReady && !isDataroomMember && (
                <>
                  {isFree && !isTrial ? (
                    <UpgradePlanModal
                      clickedPlan={PlanEnum.Pro}
                      trigger="mobile_more_visitors"
                      highlightItem={["visitors"]}
                    >
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ContactIcon className="h-5 w-5" aria-hidden="true" />
                        Visitors
                      </button>
                    </UpgradePlanModal>
                  ) : (
                    <Link
                      href="/visitors"
                      aria-current={
                        matchesNavigationPath(router.pathname, "/visitors")
                          ? "page"
                          : undefined
                      }
                      onClick={onClose}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        matchesNavigationPath(router.pathname, "/visitors")
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <ContactIcon className="h-5 w-5" aria-hidden="true" />
                      Visitors
                    </Link>
                  )}

                  <Link
                    href="/branding"
                    aria-current={
                      matchesNavigationPath(router.pathname, "/branding", true)
                        ? "page"
                        : undefined
                    }
                    onClick={onClose}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                      matchesNavigationPath(router.pathname, "/branding", true)
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <BrushIcon className="h-5 w-5" aria-hidden="true" />
                    Branding
                  </Link>

                  {features?.workflows &&
                    hasAllPermissions(role!, ["team.read"]) &&
                    ((isFree || isPro) && !isTrial ? (
                      <UpgradePlanModal
                        clickedPlan={PlanEnum.Business}
                        trigger="mobile_more_workflows"
                      >
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <WorkflowIcon
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                          Workflows
                        </button>
                      </UpgradePlanModal>
                    ) : (
                      <Link
                        href="/workflows"
                        aria-current={
                          matchesNavigationPath(router.pathname, "/workflows")
                            ? "page"
                            : undefined
                        }
                        onClick={onClose}
                        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <WorkflowIcon className="h-5 w-5" aria-hidden="true" />
                        Workflows
                      </Link>
                    ))}

                  {/* Settings with expandable sub-items */}
                  <div>
                    <button
                      type="button"
                      aria-expanded={settingsExpanded}
                      aria-controls="workspace-settings-links"
                      onClick={() => setSettingsExpanded((v) => !v)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        matchesNavigationPath(router.pathname, "/settings")
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <CogIcon className="h-5 w-5" aria-hidden="true" />
                      Settings
                      <ChevronDownIcon
                        aria-hidden="true"
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          settingsExpanded && "rotate-180",
                        )}
                      />
                    </button>
                    {settingsExpanded && (
                      <div
                        id="workspace-settings-links"
                        className="ml-8 mt-1 space-y-0.5 border-l border-border pl-3"
                      >
                        {settingsSubItems.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            aria-current={
                              matchesNavigationPath(
                                router.asPath,
                                sub.href,
                                true,
                              )
                                ? "page"
                                : undefined
                            }
                            onClick={onClose}
                            className={cn(
                              "flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors",
                              matchesNavigationPath(
                                router.asPath,
                                sub.href,
                                true,
                              )
                                ? "font-medium text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {!slackIntegration && (
                    <Link
                      href="/settings/slack"
                      onClick={onClose}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <SlackIcon className="h-5 w-5" />
                      Connect Slack
                    </Link>
                  )}
                </>
              )}
            </nav>

            {navigationReady &&
              !isDataroomMember &&
              (linksLimit || documentsLimit) && (
                <div className="mt-6 space-y-3 rounded-lg border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Usage
                  </p>
                  {linksLimit ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">Links</span>
                        <span className="text-muted-foreground">
                          {nFormatter(limits?.usage?.links ?? 0)} /{" "}
                          {nFormatter(linksLimit)}
                        </span>
                      </div>
                      <Progress
                        value={
                          limits?.usage?.links
                            ? (limits.usage.links / linksLimit) * 100
                            : 0
                        }
                        className="h-1 bg-muted"
                        max={100}
                      />
                    </div>
                  ) : null}
                  {documentsLimit ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground">Documents</span>
                        <span className="text-muted-foreground">
                          {nFormatter(limits?.usage?.documents ?? 0)} /{" "}
                          {nFormatter(documentsLimit)}
                        </span>
                      </div>
                      <Progress
                        value={
                          limits?.usage?.documents
                            ? (limits.usage.documents / documentsLimit) * 100
                            : 0
                        }
                        className="h-1 bg-muted"
                        max={100}
                      />
                    </div>
                  ) : null}
                </div>
              )}

            {navigationReady && !isDataroomMember && isTrial && (
              <div className="mt-4">
                <Link
                  href="/settings/billing"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Upgrade Plan
                </Link>
              </div>
            )}
            {navigationReady && !isDataroomMember && isFree && !isTrial && (
              <div className="mt-4">
                <Link
                  href="/settings/billing"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  Upgrade {BRAND.name}
                </Link>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
