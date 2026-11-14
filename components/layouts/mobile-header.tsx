import Link from "next/link";
import { useRouter } from "next/router";

import {
  ChevronLeftIcon,
  CircleUserRound,
  LogOut,
  MailIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { BRAND } from "@/lib/brand";
import { useSelfMembership } from "@/lib/hooks/use-self-membership";
import { useDataroom } from "@/lib/swr/use-dataroom";

import { BrandLogo } from "@/components/shared/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ModeToggle } from "../theme-toggle";

export function MobileHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isDataroomMember, loading: membershipLoading } = useSelfMembership();

  const inDataroom =
    router.pathname.startsWith("/datarooms/[id]") && !!router.query.id;
  const { dataroom } = useDataroom();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-col border-b border-border bg-background pt-[env(safe-area-inset-top,0px)] md:hidden">
      <div className="flex h-[var(--app-mobile-header-height,3.5rem)] shrink-0 touch-manipulation items-center justify-between gap-2 px-4">
        {inDataroom && dataroom?.name ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Link
              href="/datarooms"
              className="-ml-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground active:bg-muted"
              aria-label="Back to data rooms"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Link>
            <p className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
              {dataroom.name}
            </p>
          </div>
        ) : (
          <Link
            href={
              membershipLoading || isDataroomMember
                ? "/datarooms"
                : "/dashboard"
            }
            aria-label={`${BRAND.name} workspace home`}
            className="inline-flex min-h-11 items-center text-xl font-bold tracking-tighter text-foreground"
          >
            <BrandLogo />
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={session?.user?.image || ""}
                  alt={session?.user?.name || ""}
                />
                <AvatarFallback className="text-xs">
                  {session?.user?.name?.charAt(0) ||
                    session?.user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            collisionPadding={{
              top: 8,
              bottom: 8,
              left: 12,
              right: 12,
            }}
            className="w-56 rounded-lg [&_[role=menuitem]]:min-h-11 [&_button]:min-h-11"
            side="bottom"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt={session?.user?.name || ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {session?.user?.name?.charAt(0) ||
                      session?.user?.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {session?.user?.name || ""}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {session?.user?.email || ""}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ModeToggle />
            {!membershipLoading && !isDataroomMember && (
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link
                    href="/account/general"
                    aria-current={
                      router.pathname.startsWith("/account/")
                        ? "page"
                        : undefined
                    }
                  >
                    <CircleUserRound
                      className="mr-2 h-4 w-4"
                      aria-hidden="true"
                    />
                    Account settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {BRAND.supportEmail && (
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(BRAND.supportEmail!);
                    toast.success(`${BRAND.supportEmail} copied to clipboard`);
                  }}
                >
                  <MailIcon className="mr-2 h-4 w-4" />
                  Contact Support
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut({
                  callbackUrl: `${window.location.origin}`,
                })
              }
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
