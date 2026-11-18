import Head from "next/head";

import { usePwaInstall } from "./pwa-provider";

export function PagesPwaMetadata() {
  const { eligible } = usePwaInstall();
  if (!eligible) return null;
  return (
    <Head>
      <link rel="manifest" href="/manifest.webmanifest" key="pwa-manifest" />
      <link
        rel="apple-touch-icon"
        href="/icons/apple-touch-icon.png"
        key="pwa-apple-icon"
      />
      <meta
        name="apple-mobile-web-app-capable"
        content="yes"
        key="pwa-apple-capable"
      />
      <meta
        name="apple-mobile-web-app-title"
        content="Roomline"
        key="pwa-apple-title"
      />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="default"
        key="pwa-apple-status"
      />
      <meta
        name="mobile-web-app-capable"
        content="yes"
        key="pwa-mobile-capable"
      />
    </Head>
  );
}
