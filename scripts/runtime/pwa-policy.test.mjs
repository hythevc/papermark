import ts from "typescript";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const origin = "https://app.example.test";
const cacheName = "roomline-public-v1";
const publicAssets = [
  "/offline.html",
  "/icons/roomline.svg",
  "/icons/roomline-192.png",
  "/icons/roomline-512.png",
  "/icons/roomline-maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const workerSource = () =>
  readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

function assetResponse(path, overrides = {}) {
  const contentType = path.endsWith(".html")
    ? "text/html; charset=utf-8"
    : path.endsWith(".svg")
      ? "image/svg+xml"
      : "image/png";
  const response = new Response(`public asset ${path}`, {
    status: 200,
    headers: { "content-type": contentType },
    ...overrides,
  });
  Object.defineProperty(response, "url", {
    value: new URL(path, origin).href,
  });
  return response;
}

function createWorker({ network } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const networkCalls = [];
  const lifecycle = { claims: 0, skipWaiting: 0 };
  const key = (request) =>
    new URL(typeof request === "string" ? request : request.url, origin).href;
  const networkFetch = async (request, options) => {
    networkCalls.push({ request, options, url: key(request) });
    return network
      ? network(request, options)
      : assetResponse(new URL(key(request)).pathname);
  };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) {
          return store.get(key(request))?.clone();
        },
        async put(request, response) {
          store.set(key(request), response.clone());
        },
        async addAll(requests) {
          const responses = await Promise.all(
            requests.map((request) => networkFetch(request)),
          );
          if (responses.some((response) => !response.ok))
            throw new Error("Asset fetch failed");
          requests.forEach((request, index) =>
            store.set(key(request), responses[index].clone()),
          );
        },
        async keys() {
          return [...store.keys()].map((url) => new Request(url));
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(request) {
      for (const store of stores.values()) {
        const response = store.get(key(request));
        if (response) return response.clone();
      }
      return undefined;
    },
  };
  const self = {
    location: new URL("/sw.js", origin),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    skipWaiting() {
      lifecycle.skipWaiting++;
      return Promise.resolve();
    },
    clients: {
      claim() {
        lifecycle.claims++;
        return Promise.resolve();
      },
    },
    caches,
    fetch: networkFetch,
  };
  vm.runInNewContext(
    workerSource(),
    {
      self,
      caches,
      fetch: networkFetch,
      URL,
      Response,
      Request,
      Headers,
      console,
    },
    { filename: "public/sw.js", timeout: 1000 },
  );
  async function dispatch(type, request) {
    const pending = [];
    let response;
    let intercepted = false;
    listeners.get(type)?.({
      request,
      waitUntil(promise) {
        pending.push(Promise.resolve(promise));
      },
      respondWith(promise) {
        assert.equal(intercepted, false, "respondWith called once");
        intercepted = true;
        response = Promise.resolve(promise);
      },
    });
    const resolvedResponse = response ? await response : undefined;
    await Promise.all(pending);
    return { intercepted, response: resolvedResponse };
  }
  return { stores, caches, networkCalls, lifecycle, dispatch };
}

function request(path, options = {}) {
  return {
    url: new URL(path, origin).href,
    method: "GET",
    mode: "cors",
    destination: "",
    headers: new Headers(),
    ...options,
  };
}

const entries = (worker, name = cacheName) =>
  [...(worker.stores.get(name)?.keys() || [])].sort();

test("installation caches only six explicit public assets without credentials", async () => {
  const worker = createWorker();
  await worker.dispatch("install");
  assert.deepEqual(
    entries(worker),
    publicAssets.map((path) => new URL(path, origin).href).sort(),
  );
  assert.deepEqual(
    worker.networkCalls.map(({ url }) => new URL(url).pathname).sort(),
    [...publicAssets].sort(),
  );
  for (const { request, options } of worker.networkCalls) {
    const credentials = options?.credentials ?? request.credentials;
    const cache = options?.cache ?? request.cache;
    const redirect = options?.redirect ?? request.redirect;
    assert.equal(credentials, "omit", "no identity in precache requests");
    assert.equal(cache, "reload", "do not reuse an HTTP cache entry");
    assert.equal(redirect, "error", "do not cache redirected assets");
  }
});

test("activation removes obsolete owned public caches and preserves unrelated caches", async () => {
  const worker = createWorker();
  await worker.caches.open("roomline-public-v0");
  await worker.caches.open(cacheName);
  await worker.caches.open("unrelated-cache");
  await worker.dispatch("activate");
  assert.deepEqual(
    (await worker.caches.keys()).sort(),
    [cacheName, "unrelated-cache"].sort(),
  );
  assert.equal(worker.lifecycle.claims, 1);
});

test("private app, API, identity, file and framework requests never enter the worker cache path", async () => {
  const worker = createWorker();
  await worker.dispatch("install");
  const before = entries(worker);
  const count = worker.networkCalls.length;
  for (const path of [
    "/api",
    "/api/auth/session",
    "/api/file/s3/get-presigned-get-url?token=private",
    "/api/links/download/file/private/1",
    "/v1/documents",
    "/mcp",
    "/oauth/token",
    "/.well-known/openid-configuration",
    "/_next/data/build/datarooms/private.json",
    "/_next/static/chunks/app.js",
    "/_next/image?url=private-document",
    "/dashboard",
    "/datarooms/private",
    "/documents/private.pdf",
    "/view/private/d/document",
    "/view/private/downloads",
    "/login?email=private%40example.test",
    "/auth/email",
    "/_example/papermark-example-document.pdf",
    "/templates/qa-questions-template.xlsx",
    "/_static/roomline-mark.svg",
    "/manifest.webmanifest",
    "/sw.js",
  ]) {
    assert.equal(
      (await worker.dispatch("fetch", request(path))).intercepted,
      false,
      path,
    );
  }
  assert.equal(worker.networkCalls.length, count);
  assert.deepEqual(entries(worker), before);
});

test("API and framework document navigations bypass even the generic offline fallback", async () => {
  const worker = createWorker({
    network: () => Promise.reject(new Error("offline")),
  });
  for (const path of [
    "/api/auth/session",
    "/v1/documents",
    "/mcp",
    "/oauth/authorize",
    "/.well-known/openid-configuration",
    "/_next/data/build/page.json",
  ]) {
    assert.equal(
      (
        await worker.dispatch(
          "fetch",
          request(path, { mode: "navigate", destination: "document" }),
        )
      ).intercepted,
      false,
      path,
    );
  }
  assert.equal(worker.networkCalls.length, 0);
});

test("queries, foreign origins, identity headers and non-GET methods cannot use the asset cache", async () => {
  const worker = createWorker();
  await worker.dispatch("install");
  const count = worker.networkCalls.length;
  for (const candidate of [
    request("/icons/roomline-192.png?email=private%40example.test"),
    request("https://customer.example.test/icons/roomline-192.png"),
    request("/icons/roomline-192.png", {
      headers: new Headers({ authorization: "Bearer local-test-token" }),
    }),
    request("/icons/roomline-192.png", { method: "POST" }),
    request("/icons/roomline-192.png", { method: "HEAD" }),
  ]) {
    assert.equal(
      (await worker.dispatch("fetch", candidate)).intercepted,
      false,
      candidate.url,
    );
  }
  assert.equal(worker.networkCalls.length, count);
});

test("queryless exact public assets use the current public cache", async () => {
  const worker = createWorker();
  await worker.dispatch("install");
  const count = worker.networkCalls.length;
  for (const path of publicAssets) {
    const result = await worker.dispatch("fetch", request(path));
    assert.equal(result.intercepted, true, path);
    assert.equal(await result.response.text(), `public asset ${path}`);
  }
  assert.equal(worker.networkCalls.length, count, "cache hits need no network");
});

test("online private navigation is network-only and never persists the response or URL", async () => {
  let installed = false;
  const worker = createWorker({
    network: (req) =>
      installed
        ? new Response("private navigation marker", {
            headers: {
              "content-type": "text/html",
              "cache-control": "private, no-store",
            },
          })
        : assetResponse(
            new URL(typeof req === "string" ? req : req.url, origin).pathname,
          ),
  });
  await worker.dispatch("install");
  installed = true;
  const before = entries(worker);
  const result = await worker.dispatch(
    "fetch",
    request("/datarooms/private?visitor=private%40example.test", {
      mode: "navigate",
      destination: "document",
    }),
  );
  assert.equal(result.intercepted, true);
  assert.equal(await result.response.text(), "private navigation marker");
  assert.deepEqual(entries(worker), before);
});

test("offline private navigation receives the same generic public fallback without storing identity", async () => {
  let offline = false;
  const worker = createWorker({
    network: (req) =>
      offline
        ? Promise.reject(new Error("offline"))
        : assetResponse(
            new URL(typeof req === "string" ? req : req.url, origin).pathname,
          ),
  });
  await worker.dispatch("install");
  offline = true;
  const before = entries(worker);
  for (const path of [
    "/datarooms/private?email=private%40example.test",
    "/view/private/downloads",
    "/login",
  ]) {
    const result = await worker.dispatch(
      "fetch",
      request(path, { mode: "navigate", destination: "document" }),
    );
    assert.equal(result.intercepted, true, path);
    assert.equal(await result.response.text(), "public asset /offline.html");
  }
  assert.deepEqual(entries(worker), before);
});

test("HTTP error navigations preserve the server response rather than becoming offline success", async () => {
  const worker = createWorker({
    network: () => new Response("Access denied", { status: 403 }),
  });
  const result = await worker.dispatch(
    "fetch",
    request("/view/private", { mode: "navigate", destination: "document" }),
  );
  assert.equal(result.response.status, 403);
  assert.equal(await result.response.text(), "Access denied");
  assert.deepEqual(entries(worker), []);
});

for (const kind of [
  "html-disguised-as-icon",
  "redirected-asset",
  "failed-asset",
]) {
  test(`precache refuses ${kind} instead of storing an unexpected response`, async () => {
    const worker = createWorker({
      network: (req) => {
        const path = new URL(typeof req === "string" ? req : req.url, origin)
          .pathname;
        if (path !== "/icons/roomline-192.png") return assetResponse(path);
        if (kind === "failed-asset")
          return new Response("private failure", { status: 503 });
        if (kind === "redirected-asset") {
          assert.equal(req.redirect, "error");
          throw new TypeError("fetch failed: redirect mode is error");
        }
        return assetResponse(path, {
          headers: { "content-type": "text/html" },
        });
      },
    });
    await worker.dispatch("install").catch(() => {});
    assert.equal(
      worker.stores.has(cacheName),
      false,
      "failed install removes the partial public cache",
    );
    assert.equal(
      worker.lifecycle.skipWaiting,
      0,
      "failed install does not activate",
    );
  });
}

test("a public asset cache miss fetches only the fixed asset without incoming credentials or headers", async () => {
  const worker = createWorker();
  const result = await worker.dispatch(
    "fetch",
    request("/icons/roomline-192.png", {
      headers: new Headers({
        cookie: "identity=local-test",
        range: "bytes=0-10",
      }),
    }),
  );
  assert.equal(result.intercepted, true);
  assert.equal(
    await result.response.text(),
    "public asset /icons/roomline-192.png",
  );
  assert.deepEqual(entries(worker), [
    new URL("/icons/roomline-192.png", origin).href,
  ]);
  assert.equal(worker.networkCalls.length, 1);
  const { request: outgoing } = worker.networkCalls[0];
  assert.equal(outgoing.credentials, "omit");
  assert.equal(outgoing.headers.has("cookie"), false);
  assert.equal(outgoing.headers.has("range"), false);
});

test("missing generic offline fallback returns a non-cacheable 503 without consulting unrelated caches", async () => {
  const worker = createWorker({
    network: () => Promise.reject(new Error("offline")),
  });
  const unrelated = await worker.caches.open("unrelated-cache");
  await unrelated.put(
    new URL("/offline.html", origin).href,
    new Response("private poisoned fallback"),
  );
  const result = await worker.dispatch(
    "fetch",
    request("/documents/private?token=local-test", {
      mode: "navigate",
      destination: "document",
    }),
  );
  assert.equal(result.intercepted, true);
  assert.equal(result.response.status, 503);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(
    await result.response.text(),
    /private poisoned|local-test|documents/,
  );
  assert.deepEqual(entries(worker), []);
});

test("opaque public-asset responses are not accepted into the cache", async () => {
  const worker = createWorker({
    network: (req) => {
      const response = assetResponse(
        new URL(typeof req === "string" ? req : req.url, origin).pathname,
      );
      Object.defineProperty(response, "type", { value: "opaque" });
      return response;
    },
  });
  await assert.rejects(worker.dispatch("install"));
  assert.equal(worker.stores.has(cacheName), false);
});

function evaluate(path, environment, dependencies) {
  const source = readFileSync(
    new URL(`../../${path}`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (!Object.hasOwn(dependencies, name))
        throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: environment },
    URL,
    Headers,
  });
  return exports;
}

const environment = {
  NODE_ENV: "production",
  NEXT_PUBLIC_BASE_URL: "https://app.example.test",
  NEXT_PUBLIC_MARKETING_URL: "https://www.example.test",
  NEXTAUTH_URL: "https://app.example.test",
  NEXT_PUBLIC_API_BASE_HOST: "api.example.test",
  NEXT_PUBLIC_MCP_BASE_HOST: "mcp.example.test",
  NEXT_PUBLIC_WEBHOOK_BASE_HOST: "webhooks.example.test",
};

class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Headers(options.headers);
    this.kind = "response";
  }
  static next() {
    return Object.assign(new MockResponse(null), { kind: "next" });
  }
  static redirect(url) {
    return Object.assign(new MockResponse(null, { status: 302 }), {
      kind: "redirect",
      url: String(url),
    });
  }
  static rewrite(url, options) {
    return Object.assign(new MockResponse(null, options), {
      kind: "rewrite",
      url: String(url),
    });
  }
}

const pwa = evaluate("lib/pwa.ts", environment, {
  "@/lib/brand": { BRAND: { appUrl: "https://app.example.test" } },
});
const marketing = evaluate("lib/marketing-routes.ts", environment, {});
const middleware = evaluate("middleware.ts", environment, {
  "next/server": { NextResponse: MockResponse },
  "@/lib/marketing-routes": marketing,
  "@/lib/pwa": pwa,
  "@/lib/middleware/app": {
    __esModule: true,
    default: async () => ({ kind: "app-auth" }),
  },
  "@/lib/middleware/domain": {
    __esModule: true,
    default: async () => ({ kind: "custom-domain" }),
  },
  "./lib/constants": { BLOCKED_PATHNAMES: [] },
  "./lib/middleware/incoming-webhooks": {
    __esModule: true,
    default: async () => ({ kind: "webhook" }),
    isWebhookPath: (host) => host === "webhooks.example.test",
  },
  "./lib/middleware/posthog": {
    __esModule: true,
    default: async () => ({ kind: "analytics" }),
  },
}).default;

function routingRequest(host, path) {
  const url = new URL(path, `https://${host}`);
  url.clone = () => new URL(url);
  return { headers: new Headers({ host }), nextUrl: url, url: url.href };
}

test("exact PWA assets are public without invoking app authentication only on the configured application host", async () => {
  for (const path of pwa.PWA_ASSET_PATHS) {
    const response = await middleware(routingRequest("app.example.test", path));
    assert.equal(response.kind, "next", path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      (await middleware(routingRequest("api.example.test", path))).status,
      404,
      `API isolation: ${path}`,
    );
    assert.equal(
      (await middleware(routingRequest("mcp.example.test", path))).status,
      404,
      `MCP isolation: ${path}`,
    );
    assert.equal(
      (await middleware(routingRequest("www.example.test", path))).status,
      404,
      `Marketing-only host: ${path}`,
    );
    assert.equal(
      (await middleware(routingRequest("app.example.test:444", path))).status,
      404,
      `Port isolation: ${path}`,
    );
    assert.equal(
      (await middleware(routingRequest("investors.customer.test", path))).kind,
      "custom-domain",
      `Customer-domain resolver precedence: ${path}`,
    );
    assert.equal(
      (await middleware(routingRequest("webhooks.example.test", path))).kind,
      "webhook",
      `Webhook isolation: ${path}`,
    );
  }
});

test("public SW and manifest responses have explicit safe MIME and update headers", async () => {
  const worker = await middleware(routingRequest("app.example.test", "/sw.js"));
  assert.match(worker.headers.get("content-type"), /^application\/javascript/);
  assert.match(worker.headers.get("cache-control"), /no-store/);
  assert.equal(worker.headers.get("service-worker-allowed"), "/");
  const manifest = await middleware(
    routingRequest("app.example.test", "/manifest.webmanifest"),
  );
  assert.equal(
    manifest.headers.get("content-type"),
    "application/manifest+json",
  );
  assert.equal(manifest.headers.get("cache-control"), "no-cache");
});

test("PWA routing does not open wildcard folders, lookalike assets or private application routes", async () => {
  for (const path of [
    "/icons/customer-document.png",
    "/icons/roomline-192.png/private",
    "/offline.html/private",
    "/offline",
    "/manifest.webmanifest/private",
    "/sw.js/private",
    "/datarooms/private",
    "/documents/private",
    "/settings/security",
  ]) {
    assert.equal(
      (await middleware(routingRequest("app.example.test", path))).kind,
      "app-auth",
      path,
    );
  }
});
