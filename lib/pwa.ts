import { BRAND } from "@/lib/brand";

export const PWA_ASSET_PATHS = [
  "/sw.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/roomline.svg",
  "/icons/roomline-192.png",
  "/icons/roomline-512.png",
  "/icons/roomline-maskable-512.png",
  "/icons/apple-touch-icon.png",
] as const;

export function isPublicPwaAssetPathname(pathname: string): boolean {
  return (PWA_ASSET_PATHS as readonly string[]).includes(pathname);
}

type PwaHostConfiguration = {
  appUrl: string;
  apiHost?: string;
  mcpHost?: string;
  webhookHost?: string;
};

export const PWA_HOST_CONFIGURATION: PwaHostConfiguration = {
  appUrl: BRAND.appUrl,
  apiHost: process.env.NEXT_PUBLIC_API_BASE_HOST,
  mcpHost: process.env.NEXT_PUBLIC_MCP_BASE_HOST,
  webhookHost: process.env.NEXT_PUBLIC_WEBHOOK_BASE_HOST,
};

function parseAuthority(value: string | null | undefined): URL | null {
  if (!value || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

/** Host-only check for server metadata/middleware; the port must also match. */
export function isPwaApplicationHost(
  host: string | null | undefined,
  config: PwaHostConfiguration = PWA_HOST_CONFIGURATION,
): boolean {
  const request = parseAuthority(host);
  const app = parseAuthority(config.appUrl);
  if (!request || !app || request.host !== app.host) return false;
  return ![config.apiHost, config.mcpHost, config.webhookHost].some((value) => {
    const isolated = parseAuthority(value);
    return isolated?.hostname === request.hostname;
  });
}

/** Browser registration also requires the configured scheme/origin exactly. */
export function isPwaApplicationOrigin(
  origin: string,
  config: PwaHostConfiguration = PWA_HOST_CONFIGURATION,
): boolean {
  const request = parseAuthority(origin);
  const app = parseAuthority(config.appUrl);
  return Boolean(
    request &&
    app &&
    request.origin === app.origin &&
    isPwaApplicationHost(request.host, config),
  );
}
