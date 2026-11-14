import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";

import { TeamProvider } from "@/context/team-context";
import { UploadProgressProvider } from "@/context/upload-progress-context";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

import { BRAND } from "@/lib/brand";
import { EXCLUDED_PATHS } from "@/lib/constants";
import { useTrackLastVisited } from "@/lib/hooks/use-last-visited";
import { isMarketingRouteTemplate } from "@/lib/marketing-routes";

import { PostHogGroupSync } from "@/components/providers/posthog-group-sync";
import { PostHogCustomProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

function LastVisitedTracker() {
  useTrackLastVisited();
  return null;
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps<{ session: Session }>) {
  const metadata = (
    <Head>
      <title>{`${BRAND.name} | ${BRAND.tagline}`}</title>
      <meta name="theme-color" content="#174b3f" key="theme-color" />
      <meta name="description" content={BRAND.description} key="description" />
      <meta
        property="og:title"
        content={`${BRAND.name} | ${BRAND.tagline}`}
        key="og-title"
      />
      <meta
        property="og:description"
        content={BRAND.description}
        key="og-description"
      />
      <meta property="og:url" content={BRAND.marketingUrl} key="og-url" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={BRAND.name} key="tw-title" />
      <meta
        name="twitter:description"
        content={BRAND.description}
        key="tw-description"
      />
      <link rel="icon" href={BRAND.favicon} key="favicon" />
    </Head>
  );

  // Public marketing does not initialize authenticated workspace providers.
  if (isMarketingRouteTemplate(router.pathname)) {
    return (
      <>
        {metadata}
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      {metadata}
      <SessionProvider session={session}>
        <PostHogCustomProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <NuqsAdapter>
              <div className={inter.className}>
                <Toaster closeButton />
                <TooltipProvider delayDuration={100}>
                  {EXCLUDED_PATHS.includes(router.pathname) ? (
                    <Component {...pageProps} />
                  ) : (
                    <TeamProvider>
                      <PostHogGroupSync />
                      <LastVisitedTracker />
                      <UploadProgressProvider>
                        <Component {...pageProps} />
                      </UploadProgressProvider>
                    </TeamProvider>
                  )}
                </TooltipProvider>
              </div>
            </NuqsAdapter>
          </ThemeProvider>
        </PostHogCustomProvider>
      </SessionProvider>
    </>
  );
}
