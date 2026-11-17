"use client";
import { useRouter } from "next/router";

import { useEffect, useState } from "react";

import { asSupportedLocale } from "@/lib/i18n/locales";

import { resolveBrandLogo } from "./brand-logo";
import { classifyDataroomBanner } from "./dataroom-banner";
import {
  asDataroomCardLayout,
  asDataroomViewerHeaderStyle,
} from "./dataroom-viewer-layout";

export const BRANDING_PREVIEW_MESSAGE = "roomline:branding-preview";
const defaults = {
  brandLogo: "",
  hideLogo: "0",
  brandColor: "#ffffff",
  brandBanner: "",
  accentColor: "#ffffff",
  applyAccentColorToDataroomView: "0",
  cardLayout: "LIST",
  showFolderTree: "1",
  ctaLabel: "",
  ctaUrl: "",
  accentButtonColor: "#000000",
  viewerHeaderStyle: "DEFAULT",
  hideFolderIconsInMain: "0",
  welcomeMessage: "",
  defaultLanguage: "en",
};
export type BrandingPreviewParams = typeof defaults;
export function parseBrandingPreviewParams(
  input: Record<string, unknown>,
): BrandingPreviewParams {
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof BrandingPreviewParams)[]) {
    if (typeof input[key] === "string") out[key] = input[key] as string;
  }
  // Query parameters are also accepted by the standalone preview routes. Apply
  // the same safe rendering boundary before either source reaches viewer links.
  const logo = resolveBrandLogo({ logo: out.brandLogo });
  out.brandLogo = logo.kind === "custom" ? logo.src : "";
  if (out.brandBanner !== "no-banner")
    out.brandBanner = classifyDataroomBanner(out.brandBanner).src ?? "";
  for (const key of ["brandColor", "accentColor", "accentButtonColor"] as const)
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(out[key]))
      out[key] = defaults[key];
  for (const key of [
    "hideLogo",
    "applyAccentColorToDataroomView",
    "showFolderTree",
    "hideFolderIconsInMain",
  ] as const)
    if (out[key] !== "1" && out[key] !== "0") out[key] = defaults[key];
  out.cardLayout = asDataroomCardLayout(out.cardLayout);
  out.viewerHeaderStyle = asDataroomViewerHeaderStyle(out.viewerHeaderStyle);
  out.defaultLanguage = asSupportedLocale(out.defaultLanguage) ?? "en";
  try {
    const cta = new URL(out.ctaUrl);
    if (
      !["http:", "https:"].includes(cta.protocol) ||
      cta.username ||
      cta.password
    )
      out.ctaUrl = "";
  } catch {
    out.ctaUrl = "";
  }
  return out;
}
export function useBrandingPreviewParams(): BrandingPreviewParams {
  const router = useRouter();
  const [params, setParams] = useState(() =>
    parseBrandingPreviewParams(router.query),
  );
  useEffect(() => {
    if (router.isReady) setParams(parseBrandingPreviewParams(router.query));
  }, [router.isReady, router.query]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !event.data ||
        event.data.type !== BRANDING_PREVIEW_MESSAGE ||
        !event.data.params ||
        typeof event.data.params !== "object"
      )
        return;
      setParams(parseBrandingPreviewParams(event.data.params));
    };
    window.addEventListener("message", receive);
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "roomline:branding-preview-ready" },
        window.location.origin,
      );
    return () => window.removeEventListener("message", receive);
  }, []);
  return params;
}
