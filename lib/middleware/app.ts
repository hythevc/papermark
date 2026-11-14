import { NextRequest, NextResponse } from "next/server";

import { getToken } from "next-auth/jwt";

import { BRAND } from "@/lib/brand";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";

function isProtocolRelativePath(path: string) {
  return path[1] === "/" || path[1] === "\\";
}

function normalizeNextPath(
  nextPath: string | null,
  requestUrl: string,
): string {
  if (!nextPath) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  let normalized = nextPath;

  // Handle already-encoded and double-encoded `next` values.
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  if (!normalized.startsWith("/") || isProtocolRelativePath(normalized)) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const targetUrl = new URL(normalized, requestUrl);
    const requestOrigin = new URL(requestUrl).origin;

    if (targetUrl.origin !== requestOrigin) {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}

export default async function AppMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const isInvited = url.searchParams.has("invitation");
  const isAuthPage = path === LOGIN_PATH || path === REGISTER_PATH;
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie:
      new URL(process.env.NEXTAUTH_URL || BRAND.appUrl).protocol === "https:",
  })) as {
    email?: string;
    user?: {
      createdAt?: string;
    };
  };

  // Unauthenticated visitors can sign in or register; app pages require a session.
  if (!token?.email && !isAuthPage) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    // Append "next" parameter only if not navigating to the root
    if (path !== "/") {
      // Some destinations carry meaningful query params (e.g. the allow-list
      // action link identifies the link and visitor email). Preserve the full
      // search string for those so it survives the login round-trip.
      const preserveSearch =
        path === "/auth/confirm-email-change" ||
        path === "/welcome" ||
        path.startsWith("/access/");
      const nextPath = preserveSearch ? `${path}${url.search}` : path;

      loginUrl.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!token?.email && isAuthPage) {
    const rawNextPath = url.searchParams.get("next");

    if (rawNextPath) {
      const normalizedNextPath = normalizeNextPath(rawNextPath, req.url);
      const canonicalLoginUrl = new URL(path, req.url);
      canonicalLoginUrl.searchParams.set("next", normalizedNextPath);

      if (canonicalLoginUrl.search !== url.search) {
        return NextResponse.redirect(canonicalLoginUrl, { status: 308 });
      }

      // Keep the base /login URL indexable for now, but deindex parameterized variants.
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }

    return NextResponse.next();
  }

  // AUTHENTICATED if the user was created in the last 10 seconds, redirect to "/welcome"
  if (
    token?.email &&
    token?.user?.createdAt &&
    new Date(token?.user?.createdAt).getTime() > Date.now() - 10000 &&
    path !== "/welcome" &&
    !isInvited
  ) {
    return NextResponse.redirect(new URL("/welcome", req.url));
  }

  // Authenticated visitors already have an account; continue to their destination.
  if (token?.email && isAuthPage) {
    const nextPath = normalizeNextPath(url.searchParams.get("next"), req.url);
    return NextResponse.redirect(new URL(nextPath, req.url));
  }

  return NextResponse.next();
}
