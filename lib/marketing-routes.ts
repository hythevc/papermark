const PUBLIC_MARKETING_PATHS = new Set([
  "/",
  "/product",
  "/security",
  "/guides",
  "/design-system",
  "/404",
]);

/** Public content only; customer and API host isolation runs before this check. */
export function isMarketingPathname(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    PUBLIC_MARKETING_PATHS.has(path) ||
    /^\/(solutions|guides)\/[a-z0-9-]+$/.test(path)
  );
}

export function isMarketingRouteTemplate(pathname: string): boolean {
  return (
    isMarketingPathname(pathname) ||
    pathname === "/solutions/[slug]" ||
    pathname === "/guides/[slug]"
  );
}
