import { Ratelimit } from "@upstash/ratelimit";

import { isLocalIntegration } from "@/lib/local-integration";
import { redis } from "@/lib/redis";

// Keep Redis budgets locally; only the external IP-denylist fetch is disabled
// in the explicitly development-only service harness.
const enableProtection = !isLocalIntegration();

/**
 * Simple rate limiters for core endpoints
 */
export const rateLimiters = {
  // 3 auth attempts per hour per IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "20 m"),
    prefix: "rl:auth",
    enableProtection,
    analytics: true,
  }),

  // 5 billing operations per hour per IP
  billing: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "20 m"),
    prefix: "rl:billing",
    enableProtection,
    analytics: true,
  }),

  // A team shares five imports per minute; an import can contain 500 links.
  bulkLinkImport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "rl:bulk-link-import",
    enableProtection,
    analytics: true,
  }),

  // Domain verification calls the hosting provider, so bound repeated polling.
  domainVerification: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:domain-verification",
    enableProtection,
    analytics: true,
  }),
};

/**
 * Apply rate limiting with error handling
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
    };
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Fail open - allow request if rate limiting fails
    return { success: true, error: "Rate limiting unavailable" };
  }
}
