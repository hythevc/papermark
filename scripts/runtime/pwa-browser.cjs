#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.PWA_BASE_URL || "http://localhost:3000";
const origin = new URL(baseUrl).origin;
const output = path.resolve("artifacts/revamp/pwa");
const cacheName = "roomline-public-v1";
const assetPaths = [
  "/offline.html",
  "/icons/roomline.svg",
  "/icons/roomline-192.png",
  "/icons/roomline-512.png",
  "/icons/roomline-maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const report = {
  generatedAt: new Date().toISOString(),
  origin,
  method:
    "Actual local app in headless Chromium with a temporary persistent unauthenticated profile and real service worker; no network route mocks or synthetic install events. The profile is deleted when the browser closes.",
  checks: [],
  screenshots: [],
  limitations: [
    "Headless Chromium and viewport emulation do not verify OS-level installation, iOS Safari, native apps, or a physical mobile device.",
    "Tests use an unauthenticated browser and public/local probe requests; authenticated authorization and tenant isolation are outside this check.",
    "CDP installability diagnostics describe this tested origin and browser session only.",
  ],
};

async function snapshot(page) {
  return page.evaluate(async () => {
    const result = {};
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      result[name] = (await cache.keys()).map((request) => request.url).sort();
    }
    return result;
  });
}

function assertPublicCache(contents) {
  assert.deepEqual(Object.keys(contents), [cacheName]);
  assert.deepEqual(
    contents[cacheName],
    assetPaths.map((asset) => new URL(asset, origin).href).sort(),
  );
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const executablePath =
    process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "roomline-pwa-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profileDirectory, {
      headless: true,
      ...(fs.existsSync(executablePath) ? { executablePath } : {}),
      args: ["--no-sandbox"],
      viewport: { width: 390, height: 1000 },
      serviceWorkers: "allow",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45_000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      window.__pwaNaturalInstallEvent = null;
      window.addEventListener("beforeinstallprompt", (event) => {
        window.__pwaNaturalInstallEvent = {
          isTrusted: event.isTrusted,
          type: event.type,
        };
      });
    });

    for (const [asset, type] of [
      ["/sw.js", /^application\/javascript/],
      ["/manifest.webmanifest", /^application\/manifest\+json/],
    ]) {
      const response = await context.request.get(new URL(asset, origin).href, {
        timeout: 45_000,
      });
      assert.equal(response.status(), 200, asset);
      assert.match(response.headers()["content-type"], type, asset);
      if (asset === "/sw.js") {
        assert.match(response.headers()["cache-control"], /no-store/);
        assert.equal(response.headers()["service-worker-allowed"], "/");
      }
    }
    report.checks.push({
      name: "public service worker and manifest MIME/update headers",
      status: "passed",
    });

    const response = await page.goto(`${origin}/mobile`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).pathname, "/mobile");
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker?.controller),
    );
    const registration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        scope: registration.scope,
        activeScript: registration.active?.scriptURL,
        controller: navigator.serviceWorker.controller?.scriptURL,
        secureContext: window.isSecureContext,
      };
    });
    assert.equal(registration.secureContext, true);
    assert.equal(registration.scope, `${origin}/`);
    assert.equal(registration.activeScript, `${origin}/sw.js`);
    assert.equal(registration.controller, `${origin}/sw.js`);
    report.registration = registration;
    report.checks.push({
      name: "actual application provider registers and controls the application origin",
      status: "passed",
    });

    const manifestLink = page.locator('link[rel="manifest"]');
    await manifestLink.waitFor({ state: "attached" });
    assert.equal(
      await manifestLink.getAttribute("href"),
      "/manifest.webmanifest",
    );
    const manifestResponse = await context.request.get(
      `${origin}/manifest.webmanifest`,
    );
    const manifest = await manifestResponse.json();
    assert.equal(manifest.name, "Roomline");
    assert.equal(manifest.display, "standalone");
    assert.equal(new URL(manifest.start_url, origin).origin, origin);
    assert.equal(new URL(manifest.start_url, origin).pathname, "/datarooms");
    assert.equal(new URL(manifest.scope, origin).href, `${origin}/`);
    assert.ok(
      manifest.icons.some(
        (icon) => icon.sizes === "192x192" && icon.type === "image/png",
      ),
    );
    assert.ok(
      manifest.icons.some(
        (icon) => icon.sizes === "512x512" && icon.type === "image/png",
      ),
    );
    const decodedIcons = await page.evaluate(async (icons) => {
      return Promise.all(
        icons
          .filter((icon) => icon.type === "image/png")
          .map(async (icon) => {
            const image = new Image();
            image.src = icon.src;
            await image.decode();
            return {
              src: icon.src,
              width: image.naturalWidth,
              height: image.naturalHeight,
              declared: icon.sizes,
            };
          }),
      );
    }, manifest.icons);
    for (const icon of decodedIcons)
      assert.equal(`${icon.width}x${icon.height}`, icon.declared, icon.src);
    report.manifest = {
      start_url: manifest.start_url,
      scope: manifest.scope,
      display: manifest.display,
      decodedIcons,
    };
    report.checks.push({
      name: "manifest identity, scope and decoded installation icon dimensions",
      status: "passed",
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    try {
      const diagnostic = await cdp.send("Page.getInstallabilityErrors");
      report.installability = diagnostic;
      assert.deepEqual(
        diagnostic.installabilityErrors,
        [],
        "Chromium reported installability errors",
      );
      report.checks.push({
        name: "real Chromium CDP installability diagnostics",
        status: "passed",
      });
    } catch (error) {
      if (
        /wasn't found|not found|not supported|Method not found/i.test(
          error.message,
        )
      ) {
        report.checks.push({
          name: "real Chromium CDP installability diagnostics",
          status: "unavailable",
          reason:
            "The installed Chromium does not expose Page.getInstallabilityErrors.",
        });
      } else {
        throw error;
      }
    }
    report.naturalInstallEvent = await page.evaluate(
      () => window.__pwaNaturalInstallEvent,
    );
    report.installPromptObservation = report.naturalInstallEvent
      ? { status: "observed", event: report.naturalInstallEvent }
      : {
          status: "not-observed",
          reason:
            "No natural beforeinstallprompt event was emitted during this headless session. CDP installability errors were empty; no synthetic install event or OS installation was performed.",
        };
    await cdp.detach();

    assertPublicCache(await snapshot(page));
    await page.evaluate(async () => {
      for (const probe of [
        "/api/auth/session?pwa-local-privacy-probe=1",
        "/_next/data/pwa-local-privacy-probe/private.json",
        "/icons/roomline-192.png?pwa-local-identity=1",
      ]) {
        await fetch(probe, { cache: "no-store" }).catch(() => undefined);
      }
    });
    assertPublicCache(await snapshot(page));
    report.checks.push({
      name: "actual CacheStorage contains exactly the public allowlist after API, framework-data and query probes",
      status: "passed",
    });

    await page.goto(
      `${origin}/documents/pwa-local-privacy-probe?pwa-local-identity=1`,
      { waitUntil: "networkidle", timeout: 120_000 },
    );
    assert.equal(new URL(page.url()).pathname, "/login");
    assertPublicCache(await snapshot(page));
    report.checks.push({
      name: "online private navigation keeps the actual authentication redirect and adds no cached document",
      status: "passed",
    });

    await context.setOffline(true);
    const offlineResponse = await page.goto(
      `${origin}/datarooms/pwa-local-privacy-probe?pwa-local-identity=1`,
      { waitUntil: "load", timeout: 45_000 },
    );
    assert.equal(offlineResponse.fromServiceWorker(), true);
    await page
      .getByRole("heading", { level: 1, name: "Reconnect to your workspace." })
      .waitFor();
    assert.equal(await page.locator("main").count(), 1);
    assert.doesNotMatch(
      await page.locator("body").innerText(),
      /pwa-local-identity|pwa-local-privacy-probe/,
    );
    assertPublicCache(await snapshot(page));
    const apiProbe = await page.evaluate(async () => {
      try {
        const response = await fetch(
          "/api/auth/session?pwa-local-offline-probe=1",
          { cache: "no-store" },
        );
        return {
          resolved: true,
          status: response.status,
          contentType: response.headers.get("content-type"),
        };
      } catch {
        return { resolved: false };
      }
    });
    assert.equal(
      apiProbe.resolved,
      false,
      "offline API request must not receive an HTML fallback",
    );
    for (const viewport of [
      { width: 390, height: 1000 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      const screenshot = `artifacts/revamp/pwa/offline-${viewport.width}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      report.screenshots.push({
        route: "/datarooms/pwa-local-privacy-probe",
        state: "generic-offline-fallback",
        viewport,
        screenshot,
        status: "captured-unreviewed",
      });
    }
    report.checks.push({
      name: "offline document navigation receives only the generic fallback; API fetch fails and cache stays public-only",
      status: "passed",
    });

    await context.setOffline(false);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/login", {
      timeout: 120_000,
    });
    assertPublicCache(await snapshot(page));
    assert.deepEqual(pageErrors, [], "browser page errors");
    report.checks.push({
      name: "reconnect retry reloads the original route and restores the server authentication flow",
      status: "passed",
    });
    report.cacheContents = await snapshot(page);
    report.pageErrors = pageErrors;
  } catch (error) {
    report.checks.push({ status: "failed", error: error.message });
    process.exitCode = 1;
  } finally {
    try {
      if (context) await context.close();
    } finally {
      fs.rmSync(profileDirectory, { recursive: true, force: true });
    }
    fs.writeFileSync(
      path.join(output, "browser-report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    for (const check of report.checks)
      console.log(check.status.toUpperCase(), check.name || check.error);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
