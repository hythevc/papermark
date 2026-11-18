#!/usr/bin/env node
/* Real, read-only capture of retained synthetic local fixtures. Never write
 * authenticated storage, cookies, request bodies or response bodies to artifacts. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const root = path.resolve(__dirname, "../..");
const origin = new URL(process.env.LOCAL_UI_ORIGIN || "http://localhost:3000").origin;
const stateFile = process.env.LOCAL_UI_STATE_FILE || "/workspace/scratch/roomline-runtime/owner-auth-state.json";
const fixtureFile = process.env.LOCAL_UI_FIXTURE_FILE || "/workspace/scratch/roomline-runtime/integration-fixtures.json";
const output = path.join(root, "artifacts/runtime/authenticated");

async function main() {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Use isolated local fixtures only.");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const fixtures = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const ownerTeamId = fixtures.teams[0];
  const roomId = fixtures.rooms[0];
  assert.ok(ownerTeamId && roomId && fixtures.users[0]);
  const privateValues = [...state.cookies.map((cookie) => cookie.value), ...fixtures.users, ...fixtures.teams, ...fixtures.rooms, ...fixtures.links].filter(Boolean);
  const scrub = (input) => {
    let text = String(input);
    for (const value of privateValues) text = text.split(value).join("[fixture]");
    return text.replace(/([?&](?:token|secret|code|password|api_key|access_token)=)[^\s&#"'<>]+/gi, "$1[redacted]").replace(/((?:authorization|cookie|set-cookie)\s*:\s*)[^\r\n]+/gi, "$1[redacted]").slice(0, 1600);
  };
  const report = {
    checkedAt: new Date().toISOString(),
    expectedServerMode: process.env.LOCAL_UI_SERVER_MODE || "unspecified",
    method: "Attempt four actual authenticated local screenshots using retained synthetic owner fixtures; no route, API or authentication mocks and no product mutation.",
    captures: [],
    limitations: ["Target coverage is only the documents library and one owned room overview in light theme at two desktop-browser viewport widths; captures and their individual statuses record the actual outcome.", "Automated Axe checks do not establish complete accessibility conformance; no physical device, native app or 95-screen visual pass is claimed.", "Optional external provider errors are recorded as observed; this test does not configure or verify those providers."]
  };
  fs.mkdirSync(output, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    const context = await browser.newContext({ storageState: state, colorScheme: "light", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(({ teamId, allowedOrigin }) => {
      if (location.origin === allowedOrigin) localStorage.setItem("currentTeamId", teamId);
    }, { teamId: ownerTeamId, allowedOrigin: origin });
    const page = await context.newPage();
    let active;
    page.on("pageerror", (error) => active?.pageErrors.push(scrub(error.message)));
    page.on("console", (message) => { if (["error", "warning"].includes(message.type())) active?.console.push({ type: message.type(), text: scrub(message.text()) }); });
    page.on("response", async (response) => {
      const row = active;
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400) row?.httpErrors.push({ path: scrub(pathname), status: response.status(), resourceType: response.request().resourceType() });
      if (row && response.status() === 200 && /\/billing\/plan$/.test(pathname)) {
        try {
          const plan = await response.json();
          row.billingPlan = { status: 200, plan: plan.plan, billingProviderState: plan.billingProviderState, providerVerified: plan.providerVerified, billingActionsAvailable: plan.billingActionsAvailable };
        } catch { row.billingPlan = { status: 200, bodyRead: "unavailable" }; }
      }
    });
    page.on("requestfailed", (request) => active?.failedRequests.push({ path: scrub(new URL(request.url()).pathname), failure: scrub(request.failure()?.errorText || "failed") }));
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const screen of [{ name: "documents", route: "/documents", template: "/documents", source: "pages/documents/index.tsx", heading: "All Documents" }, { name: "room-overview", route: `/datarooms/${roomId}`, template: "/datarooms/[id]", source: "pages/datarooms/[id]/index.tsx", heading: "Overview" }]) {
        active = { route: screen.template, source: screen.source, state: "default", viewport, status: "pending", pageErrors: [], console: [], httpErrors: [], failedRequests: [] };
        report.captures.push(active);
        try {
          const response = await page.goto(`${origin}${screen.route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
          active.httpStatus = response.status();
          assert.equal(response.status(), 200);
          assert.equal(new URL(page.url()).pathname, screen.route, "Actual authentication must reach the requested screen.");
          active.loadingObserved = await page.getByText(/^Loading(?:\.{3}|…)?$/i).count();
          await page.getByRole("heading", { name: screen.heading, exact: true }).waitFor({ timeout: 60000 });
          try { await page.waitForLoadState("networkidle", { timeout: 20000 }); active.networkSettled = true; } catch { active.networkSettled = false; }
          try {
            await page.evaluate(() => document.fonts.ready);
          } catch (error) {
            // A first dev compile can finish with a real HMR document reload.
            // Wait for the same authenticated route again; never replace it.
            if (!/Execution context was destroyed/.test(error.message)) throw error;
            active.devReloadObserved = true;
            await page.waitForURL((url) => url.pathname === screen.route, { timeout: 120000 });
            await page.getByRole("heading", { name: screen.heading, exact: true }).waitFor({ timeout: 60000 });
            await page.waitForLoadState("domcontentloaded");
            await page.evaluate(() => document.fonts.ready);
          }
          assert.equal(new URL(page.url()).pathname, screen.route, "The authenticated route must remain selected after data and fonts settle.");
          active.geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, mainCount: document.querySelectorAll("main").length }));
          active.buildId = await page.evaluate(() => window.__NEXT_DATA__?.buildId || null);
          if (process.env.LOCAL_UI_SERVER_MODE === "production") assert.ok(active.buildId && active.buildId !== "development", "Expected the actual production build.");
          active.visibleAlerts = (await page.getByRole("alert").allTextContents()).map(scrub);
          active.loadingRemaining = await page.getByText(/^Loading(?:\.{3}|…)?$/i).count();
          try {
            const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
            active.axe = { violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, description: v.description, affectedNodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((node) => node.target.map(scrub)) })), incompleteCount: axe.incomplete.length };
          } catch (error) { active.axe = { status: "unavailable", reason: scrub(error.message) }; }
          active.screenshot = `artifacts/runtime/authenticated/${screen.name}-${viewport.width}.png`;
          await page.screenshot({ path: path.join(root, active.screenshot), fullPage: true, animations: "disabled" });
          active.status = "captured-unreviewed";
        } catch (error) { active.status = "failed"; active.error = scrub(error.message); process.exitCode = 1; }
        console.log(`${screen.name} ${viewport.width}: ${active.status}`);
      }
    }
    report.aliasChecks = [];
    for (const alias of ["/settings/billing/upgrade", "/settings/upgrade"]) {
      try {
        const response = await context.request.get(`${origin}${alias}`, { maxRedirects: 5, timeout: 120000 });
        const destination = new URL(response.url()).pathname;
        assert.equal(response.status(), 200);
        assert.equal(destination, "/settings/billing");
        report.aliasChecks.push({ route: alias, destination, status: "passed", httpStatus: response.status(), redirectLimit: 5 });
      } catch (error) { report.aliasChecks.push({ route: alias, status: "failed", error: scrub(error.message) }); process.exitCode = 1; }
    }
    try {
      const cacheEntries = await page.evaluate(async () => {
        const result = {};
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          result[name] = (await cache.keys()).map((request) => ({ path: new URL(request.url).pathname, hasQuery: Boolean(new URL(request.url).search) }));
        }
        return result;
      });
      const allowed = new Set(["/offline.html", "/icons/roomline.svg", "/icons/roomline-192.png", "/icons/roomline-512.png", "/icons/roomline-maskable-512.png", "/icons/apple-touch-icon.png"]);
      const own = cacheEntries["roomline-public-v1"] || [];
      report.cachePrivacy = { status: Object.keys(cacheEntries).length === 1 && own.length === 6 && own.every((entry) => !entry.hasQuery && allowed.has(entry.path)) ? "passed" : "failed", entries: Object.fromEntries(Object.entries(cacheEntries).map(([name, entries]) => [name === "roomline-public-v1" ? name : "[unexpected cache]", entries.map((entry) => ({ path: allowed.has(entry.path) ? entry.path : "[unexpected path omitted]", hasQuery: entry.hasQuery }))])) };
    } catch (error) { report.cachePrivacy = { status: "unavailable", reason: scrub(error.message) }; }
    await context.close();
  } catch (error) { report.failure = scrub(error.message); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  }
}
main().catch(() => { console.error("Protected UI capture could not complete; inspect the redacted local report."); process.exitCode = 1; });
