import Link from "next/link";

import type { ReactNode } from "react";

import { Close as DialogClose } from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BillingUnavailableNotice({ reason }: { reason: string }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-lg font-semibold">Billing changes unavailable</h2>
      <p
        role="status"
        className="max-w-prose text-base leading-relaxed text-muted-foreground"
      >
        {reason}
      </p>
      <Button disabled className="min-h-11">
        Paid billing unavailable
      </Button>
    </section>
  );
}

export function BillingUnavailableDialog({
  open,
  setOpen,
  children,
  reason,
  trialEligible = false,
}: {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  children?: ReactNode;
  reason: string;
  trialEligible?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Billing changes unavailable</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {reason}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          No payment or subscription change has been made.
        </p>
        <DialogFooter>
          {trialEligible && (
            <Button asChild className="min-h-11">
              <Link href="/welcome?type=dataroom-trial">
                Start free Data Rooms Plus trial
              </Link>
            </Button>
          )}
          <Button disabled className="min-h-11">
            Paid billing unavailable
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="min-h-11">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
