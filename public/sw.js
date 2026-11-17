/* Roomline's worker caches public installation assets only. No workspace,
 * identity, document, API, Next.js data, or navigation response is persisted. */
const CACHE_NAME = "roomline-public-v1";
const OFFLINE_PATH = "/offline.html";
const PUBLIC_ASSETS = new Map([
  [OFFLINE_PATH, "text/html"],
  ["/icons/roomline.svg", "image/svg+xml"],
  ["/icons/roomline-192.png", "image/png"],
  ["/icons/roomline-512.png", "image/png"],
  ["/icons/roomline-maskable-512.png", "image/png"],
  ["/icons/apple-touch-icon.png", "image/png"],
]);

function isPublicAsset(url) {
  return (
    url.origin === self.location.origin &&
    !url.search &&
    PUBLIC_ASSETS.has(url.pathname)
  );
}

function isServicePath(pathname) {
  return ["/api", "/v1", "/mcp", "/oauth", "/.well-known", "/_next"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function fetchPublicAsset(pathname) {
  const url = new URL(pathname, self.location.origin);
  const response = await fetch(
    new Request(url, {
      credentials: "omit",
      cache: "reload",
      redirect: "error",
    }),
  );
  const contentType = response.headers.get("content-type") || "";
  if (
    !response.ok ||
    !["basic", "default"].includes(response.type) ||
    !contentType.startsWith(PUBLIC_ASSETS.get(pathname))
  )
    throw new Error("Public installation asset unavailable");
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        for (const path of PUBLIC_ASSETS.keys()) {
          await cache.put(
            new URL(path, self.location.origin).href,
            await fetchPublicAsset(path),
          );
        }
        await self.skipWaiting();
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("roomline-public-") && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("authorization") ||
    isServicePath(url.pathname)
  )
    return;
  if (isPublicAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        const response = await fetchPublicAsset(url.pathname);
        await cache.put(url.href, response.clone());
        return response;
      })(),
    );
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Return server auth/permission/error responses as-is; never cache them.
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(
              new URL(OFFLINE_PATH, self.location.origin).href,
            )) ||
            new Response(
              "Roomline is offline. Reconnect and reload to continue.",
              {
                status: 503,
                headers: {
                  "content-type": "text/plain; charset=utf-8",
                  "cache-control": "no-store",
                },
              },
            )
          );
        }
      })(),
    );
  }
});
