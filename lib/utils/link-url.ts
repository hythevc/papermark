import { BRAND } from "@/lib/brand";

/** The legacy wire value is normalized to a default link by the existing APIs. */
export const LEGACY_DEFAULT_LINK_DOMAIN = "papermark.com";
export const DEFAULT_LINK_HOST = new URL(BRAND.appUrl).host;

/** Resolve an internal path only on the configured application origin. */
export function constructAppUrl(path: string, appOrigin = BRAND.appUrl) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("An application URL requires an internal absolute path.");
  }
  const base = new URL(appOrigin);
  const url = new URL(path, base);
  if (url.origin !== base.origin) {
    throw new Error("An application path cannot leave the application origin.");
  }
  return url.toString();
}

export type ShareLinkTarget = {
  id: string;
  domainId?: string | null;
  domainSlug?: string | null;
  slug?: string | null;
};

export function constructLinkUrl(
  link: ShareLinkTarget,
  appOrigin = BRAND.appUrl,
) {
  // Queries that select only the domain/slug pair can still describe a custom
  // link. An explicit null domainId remains the stored default-link state.
  if (
    (link.domainId === undefined || Boolean(link.domainId)) &&
    link.domainSlug &&
    link.slug
  ) {
    return `https://${link.domainSlug}/${link.slug}`;
  }
  return constructAppUrl(`/view/${encodeURIComponent(link.id)}`, appOrigin);
}

/** Owner previews stay on the app host where their authenticated cookie lives. */
export function constructPreviewLinkUrl(
  linkId: string,
  previewToken: string,
  appOrigin = BRAND.appUrl,
) {
  const url = new URL(constructLinkUrl({ id: linkId }, appOrigin));
  url.searchParams.set("previewToken", previewToken);
  return url.toString();
}
