import Link from "next/link";

import { BRAND } from "@/lib/brand";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { Button } from "@/components/ui/button";

export default function MobilePage() {
  return (
    <MarketingShell
      title="Roomline on your home screen"
      description="Install Roomline from a supported browser, or add it to your iPhone or iPad home screen."
      path="/mobile"
    >
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="mb-4 text-sm font-medium text-primary">Mobile web app</p>
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Your workspace, one tap away.
        </h1>
        <p className="mb-8 mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Add Roomline to your home screen or app launcher. Open the same
          workspace and sharing controls in a window of their own.
        </p>
        <PwaInstallButton />
        <div className="mt-12 divide-y divide-border border-y border-border">
          <section className="py-8" aria-labelledby="android-install">
            <h2
              id="android-install"
              className="scroll-mt-24 text-xl font-semibold"
            >
              Android and supported desktop browsers
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>
                Open{" "}
                <a
                  href={`${BRAND.appUrl}/mobile`}
                  className="break-all font-medium text-primary underline underline-offset-4"
                >
                  your Roomline app
                </a>{" "}
                in Chrome, Edge, or another browser that supports web app
                installation.
              </li>
              <li>
                Use “Install Roomline” above when available. You can also open
                the browser menu and choose “Install app” or “Add to Home
                screen.”
              </li>
              <li>
                Confirm in your browser, then open Roomline from your home
                screen or app launcher. Sign in when prompted.
              </li>
            </ol>
          </section>
          <section className="py-8" aria-labelledby="ios-install">
            <h2 id="ios-install" className="scroll-mt-24 text-xl font-semibold">
              iPhone and iPad
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-muted-foreground">
              <li>
                Open{" "}
                <a
                  href={`${BRAND.appUrl}/mobile`}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Roomline in Safari
                </a>
                .
              </li>
              <li>
                Open the Share menu and choose “Add to Home Screen.” You may
                need to scroll the menu to find it.
              </li>
              <li>
                Keep “Open as Web App” enabled if Safari offers it, then tap
                “Add.” Open Roomline from the new home screen icon.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Safari uses these manual steps. It does not provide the install
              prompt used by Chromium browsers.
            </p>
          </section>
          <section className="py-8" aria-labelledby="connection-needed">
            <h2
              id="connection-needed"
              className="scroll-mt-24 text-xl font-semibold"
            >
              Keep an internet connection
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Rooms, documents, sign-in, uploads, and sharing need a connection.
              The app stores only its public installation icons and a reconnect
              screen in its offline cache. It does not save your workspace or
              documents for offline use.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Installation does not change access permissions, add a native app,
              or enable push notifications. Your browser still manages sign-in
              sessions and site storage.
            </p>
          </section>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/datarooms">Open workspace</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/security">Review sharing and security</Link>
          </Button>
        </div>
      </div>
    </MarketingShell>
  );
}
