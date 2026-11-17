import Link from "next/link";

import { BRAND } from "@/lib/brand";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";

export default function PartnersPage() {
  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Partner program
        </h1>
        <p className="mt-3 text-muted-foreground">
          A partner offer has not been configured for this deployment. No
          discounts, referral payments, or invitations are active through this
          page.
        </p>
        <p className="mt-4 text-sm">
          Your existing workspace and sharing links continue to use their normal
          access settings.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {BRAND.supportEmail && (
            <Button asChild variant="outline">
              <a href={`mailto:${BRAND.supportEmail}`}>Contact support</a>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard">Return to workspace</Link>
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}
