const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const root = process.cwd() + "/";
function evaluate(path, env, requireMock, suffix = "") {
  const code = ts.transpileModule(
    fs.readFileSync(root + path, "utf8") + suffix,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: requireMock,
    process: { env },
    URL,
    Headers,
    console,
  });
  return exports;
}
const env = {
  NODE_ENV: "production",
  NEXT_PUBLIC_BASE_URL: "https://app.example.test",
  NEXT_PUBLIC_MARKETING_URL: "https://www.example.test",
  NEXTAUTH_URL: "https://app.example.test",
  NEXT_PUBLIC_API_BASE_HOST: "api.example.test",
};
const brand = evaluate("lib/brand.ts", env, () => ({}));
assert.equal(brand.BRAND.appUrl, "https://app.example.test");
assert.equal(brand.BRAND.supportEmail, undefined);
assert.equal(brand.BRAND.termsUrl, undefined);
assert.equal(
  brand.brandMetadata().metadataBase.origin,
  "https://www.example.test",
);
assert.equal(
  brand.brandMetadata("Sign in", "description", "/login").openGraph.url,
  "https://app.example.test/login",
);
class responses {
  constructor(body, options) {
    this.kind = "status";
    this.status = options.status;
  }
  static next() {
    return { kind: "next" };
  }
  static redirect(url) {
    return { kind: "redirect", url: String(url) };
  }
}
const marketing = evaluate("lib/marketing-routes.ts", env, () => ({}));
const routing = evaluate(
  "middleware.ts",
  env,
  (name) => {
    if (name === "next/server") return { NextResponse: responses };
    if (name.endsWith("/app"))
      return { __esModule: true, default: async () => ({ kind: "app-auth" }) };
    if (name.endsWith("/domain"))
      return {
        __esModule: true,
        default: async () => ({ kind: "custom-domain" }),
      };
    if (name.endsWith("/incoming-webhooks"))
      return {
        __esModule: true,
        default: async () => ({ kind: "webhook" }),
        isWebhookPath: () => false,
      };
    if (name.endsWith("/posthog"))
      return { __esModule: true, default: async () => ({ kind: "analytics" }) };
    if (name.endsWith("/constants")) return { BLOCKED_PATHNAMES: [] };
    if (name.endsWith("/marketing-routes")) return marketing;
    throw new Error("Unexpected dependency: " + name);
  },
  "\nexport { isCustomDomain };",
);
for (const host of [
  "app.example.test",
  "www.example.test",
  "api.example.test",
  "localhost:3000",
  "127.0.0.1:3000",
  "branch.vercel.app",
])
  assert.equal(routing.isCustomDomain(host), false, host);
for (const host of [
  "investors.client.test",
  "app.example.test.attacker.test",
  "example.test",
])
  assert.equal(routing.isCustomDomain(host), true, host);
const request = (host, pathname) => ({
  headers: new Headers({ host }),
  nextUrl: { pathname },
  url: `https://${host}${pathname}`,
});
(async () => {
  assert.equal(
    (await routing.default(request("app.example.test", "/"))).kind,
    "next",
  );
  for (const path of [
    "/product",
    "/security",
    "/solutions/fundraising",
    "/solutions/due-diligence",
    "/guides",
    "/guides/sharing-checklist",
    "/design-system",
    "/404",
  ]) {
    assert.equal(
      (await routing.default(request("app.example.test", path))).kind,
      "next",
      path,
    );
    assert.equal(
      (await routing.default(request("investors.client.test", path))).kind,
      "custom-domain",
      path,
    );
    assert.equal(
      (await routing.default(request("api.example.test", path))).status,
      404,
      path,
    );
  }
  for (const path of [
    "/dashboard",
    "/settings/security",
    "/datarooms/private/documents",
    "/guides/private/settings",
  ])
    assert.equal(
      (await routing.default(request("app.example.test", path))).kind,
      "app-auth",
      path,
    );
  assert.equal(
    (await routing.default(request("app.example.test", "/dashboard"))).kind,
    "app-auth",
  );
  assert.equal(
    (await routing.default(request("investors.client.test", "/"))).kind,
    "custom-domain",
  );
  assert.equal(
    (await routing.default(request("api.example.test", "/"))).kind,
    "redirect",
  );
  const hanko = evaluate("lib/hanko.ts", {}, () => ({
    tenant: () => {
      throw new Error("Unconfigured passkeys initialized");
    },
  }));
  assert.equal(hanko.default, null);
  const serverOnlyBrand = evaluate(
    "lib/brand.ts",
    { NEXTAUTH_URL: "https://app.private.test" },
    () => ({}),
  );
  const browserBrand = evaluate("lib/brand.ts", {}, () => ({}));
  assert.equal(serverOnlyBrand.BRAND.appUrl, browserBrand.BRAND.appUrl);
  let currentToken = null;
  const appMiddleware = evaluate("lib/middleware/app.ts", env, (name) => {
    if (name === "next/server") return { NextResponse: responses };
    if (name === "next-auth/jwt") return { getToken: async () => currentToken };
    if (name === "@/lib/brand") return brand;
    throw new Error("Unexpected dependency: " + name);
  }).default;
  const appRequest = (path) => ({
    nextUrl: new URL(path, "https://app.example.test"),
    url: new URL(path, "https://app.example.test").toString(),
  });
  assert.equal((await appMiddleware(appRequest("/register"))).kind, "next");
  assert.equal((await appMiddleware(appRequest("/login"))).kind, "next");
  assert.equal(
    (await appMiddleware(appRequest("/dashboard"))).kind,
    "redirect",
  );
  assert.equal(
    (await appMiddleware(appRequest("/register?next=https://attacker.test")))
      .url,
    "https://app.example.test/register?next=%2Fdashboard",
  );
  assert.equal(
    (await appMiddleware(appRequest("/login?next=%252F%252Fattacker.test")))
      .url,
    "https://app.example.test/login?next=%2Fdashboard",
  );
  currentToken = { email: "member@example.test" };
  assert.equal(
    (await appMiddleware(appRequest("/register?next=%2Fdocuments"))).url,
    "https://app.example.test/documents",
  );
  console.log(
    "Passed brand URL hydration parity, metadata, exact host routing, public/auth/custom-domain isolation, registration/login redirects, unsafe next normalization, and optional passkey smoke checks.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
