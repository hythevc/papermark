import type { Metadata } from "next";

function httpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

// This module is shared with the browser: only public variables may affect
// rendered URLs, so server rendering and hydration use the same identity.
const appHost = process.env.NEXT_PUBLIC_APP_BASE_HOST?.trim();
const appUrl =
  httpUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
  (appHost
    ? httpUrl(
        `${appHost.startsWith("localhost") ? "http" : "https"}://${appHost}`,
      )
    : undefined) ||
  "http://localhost:3000";

/** Product identity. Customer-owned room brands remain separate. */
export const BRAND = {
  name: "Roomline",
  tagline: "Move the conversation forward.",
  description:
    "Bring your documents, sharing controls, and viewer insights together in one focused workspace.",
  appUrl,
  marketingUrl: httpUrl(process.env.NEXT_PUBLIC_MARKETING_URL) || appUrl,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || undefined,
  termsUrl: httpUrl(process.env.NEXT_PUBLIC_TERMS_URL),
  privacyUrl: httpUrl(process.env.NEXT_PUBLIC_PRIVACY_URL),
  logo: "/_static/roomline-logo.svg",
  logoLight: "/_static/roomline-logo-light.svg",
  mark: "/_static/roomline-mark.svg",
  favicon: "/_static/roomline-mark.svg",
} as const;

export function brandMetadata(
  title: string = `${BRAND.name} | ${BRAND.tagline}`,
  description: string = BRAND.description,
  path: string = "/",
): Metadata {
  return {
    metadataBase: new URL(BRAND.marketingUrl),
    title,
    description,
    icons: { icon: BRAND.favicon },
    openGraph: {
      title,
      description,
      url: new URL(path, BRAND.appUrl).toString(),
      siteName: BRAND.name,
      locale: "en_US",
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}
