#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const ROOT = path.resolve(__dirname, "../..");
const EXPORTED = path.join(ROOT, ".roomline-marketing-output");
const OUTPUT = path.join(ROOT, "artifacts/runtime/marketing");
const HOST = "127.0.0.1";
const PORT = 3002;
const ORIGIN = `http://${HOST}:${PORT}`;
const ROUTES = ["/", "/product", "/security", "/solutions/fundraising", "/solutions/due-diligence", "/guides", "/guides/fundraising-checklist", "/guides/sharing-checklist", "/mobile", "/404"];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const PRIVATE = /^\/(?:api|auth|dashboard|datarooms|documents|login|register)(?:\/|$)/;
const normalize = (value) => value === "/" ? value : value.replace(/\/+$/, "");
const nameFor = (route) => route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
const publicPath = (file) => path.relative(ROOT, file).split(path.sep).join("/");

async function fileAt(relative) {
  const location = path.resolve(EXPORTED, `.${relative}`);
  if (location !== EXPORTED && !location.startsWith(EXPORTED + path.sep)) return null;
  try { return (await fsp.lstat(location)).isFile() ? location : null; }
  catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return null; throw error; }
}

async function staticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const url = new URL(req.url, ORIGIN);
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes("\\") || pathname.includes("\0")) { res.writeHead(400); res.end(); return; }
      let status = 200;
      let location = null;
      if (!PRIVATE.test(pathname)) {
        if (normalize(pathname) === "/404") status = 404;
        else location = await fileAt(pathname);
        if (!location && status !== 404) location = await fileAt(`${pathname.replace(/\/$/, "")}/index.html`);
        if (location && location.endsWith("/index.html") && pathname !== "/" && !pathname.endsWith("/")) {
          res.writeHead(308, { Location: `${url.pathname}/${url.search}` }); res.end(); return;
        }
      }
      if (!location) { location = await fileAt("/404.html"); status = 404; }
      const body = await fsp.readFile(location);
      res.writeHead(status, { "Content-Type": TYPES[path.extname(location)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Length": body.length });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch { res.writeHead(500); res.end("Static verification server could not read this artifact."); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(PORT, HOST, resolve); });
  return server;
}

function pngSize(file) {
  const bytes = fs.readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function screenshot(page, filename, fullPage = true) {
  const file = path.join(OUTPUT, filename);
  await page.screenshot({ path: file, fullPage, animations: "disabled" });
  return { path: publicPath(file), dimensions: pngSize(file) };
}

async function main() {
  const build = JSON.parse(await fsp.readFile(path.join(EXPORTED, "roomline-marketing-build.json"), "utf8"));
  await fsp.mkdir(OUTPUT, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(), staticOrigin: ORIGIN,
    artifact: { builtAt: build.builtAt, sourceDigest: build.sourceDigest, applicationOrigin: build.applicationOrigin, marketingOrigin: build.marketingOrigin, exportedFiles: build.exportedFiles },
    environment: { browser: "isolated headless Chromium", browserPlugin: "Required Browser js/setupBrowserRuntime tool unavailable; explicit local Playwright validation authorized", contexts: 1, themes: ["marketing-light"], viewports: [{ width: 1440, height: 1000 }, { width: 390, height: 844 }], reducedMotion: "reduce" },
    captures: [], interactions: [], foreignRequestsBlocked: [], privateRequests: [],
    limitations: ["Local static-export evidence does not prove hosted Vercel routing or deployment.", "Railway account actions were inspected, not followed; no authentication, API, email, storage or billing flow is verified by this run.", "Axe covers automated WCAG2A/AA and2.1AA checks; it does not establish complete accessibility conformance.", "Headless viewport checks are not physical-device or native-app verification."],
  };
  const server = await staticServer();
  let browser;
  let context;
  let active = null;
  let failures = 0;
  const record = async (name, work) => {
    const row = { name };
    try { Object.assign(row, await work()); row.result = "passed"; }
    catch (error) { row.result = "failed"; row.error = error.message; failures++; }
    report.interactions.push(row);
    console.log(`INTERACTION ${name}: ${row.result}`);
  };
  try {
    const executable = process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium";
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(executable) ? { executablePath: executable } : {}), args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    report.environment.version = browser.version();
    context = await browser.newContext({ viewport: report.environment.viewports[0], colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) { report.foreignRequestsBlocked.push({ origin: url.origin, path: url.pathname, resourceType: route.request().resourceType() }); await route.abort("blockedbyclient"); return; }
      if (PRIVATE.test(url.pathname)) { report.privateRequests.push({ path: url.pathname, resourceType: route.request().resourceType() }); await route.abort("blockedbyclient"); return; }
      await route.continue();
    });
    await context.addInitScript(() => {
      window.__roomlineStaticProbe = { workerAttempts: 0 };
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register = () => { window.__roomlineStaticProbe.workerAttempts++; return Promise.reject(new Error("Marketing must not register a service worker.")); };
      }
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => active?.pageErrors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) active?.console.push({ type: message.type(), text: message.text(), path: (() => { try { return new URL(message.location().url).pathname; } catch { return ""; } })() });
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && active) active.httpErrors.push({ path: new URL(response.url()).pathname, status: response.status(), resourceType: response.request().resourceType() });
    });
    const load = async (route) => {
      const response = await page.goto(new URL(route, ORIGIN).href, { waitUntil: "networkidle", timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      return response;
    };
    for (const viewport of report.environment.viewports) {
      await page.setViewportSize(viewport);
      for (const route of ROUTES) {
        const row = { route, viewport, theme: "marketing-light", pageErrors: [], console: [], httpErrors: [] };
        active = row;
        try {
          const response = await load(route);
          row.status = response.status(); row.finalPath = new URL(page.url()).pathname; row.title = await page.title();
          assert.equal(row.status, route === "/404" ? 404 : 200);
          assert.equal(normalize(row.finalPath), route);
          assert.ok(row.title.includes("Roomline"));
          row.h1 = await page.locator("h1").count(); row.main = await page.locator("main").count();
          assert.equal(row.h1, 1, "one page heading"); assert.equal(row.main, 1, "one main landmark");
          row.heading = await page.locator("h1").innerText();
          assert.ok((await page.locator("main").innerText()).trim().length > 80, "meaningful content");
          assert.equal(await page.locator("nextjs-portal").count(), 0, "no framework overlay");
          row.layout = await page.evaluate(() => ({ viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
          assert.ok(row.layout.scrollWidth <= viewport.width + 1 && row.layout.bodyWidth <= viewport.width + 1, `horizontal overflow: ${JSON.stringify(row.layout)}`);
          row.accountLinks = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => ({ text: anchor.textContent.trim(), raw: anchor.getAttribute("href"), href: anchor.href })).filter((anchor) => /^\/(?:register|login|datarooms|dashboard|auth)(?:\/|\?|#|$)/.test(new URL(anchor.href).pathname)));
          for (const link of row.accountLinks) assert.equal(new URL(link.href).origin, build.applicationOrigin, `account action ${link.text} must open the app`);
          if (route !== "/404") assert.ok(row.accountLinks.length >= 2, "real app CTAs present");
          if (route === "/mobile") {
            row.installGuideHref = await page.getByRole("link", { name: "Open Roomline to install", exact: true }).getAttribute("href");
            assert.equal(row.installGuideHref, `${build.applicationOrigin}/mobile`);
          }
          row.pwa = await page.evaluate(async () => ({ manifests: document.querySelectorAll('link[rel="manifest"]').length, workerAttempts: window.__roomlineStaticProbe.workerAttempts, registrations: "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }));
          assert.deepEqual(row.pwa, { manifests: 0, workerAttempts: 0, registrations: 0 });
          const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
          row.accessibility = { tags: ["wcag2a", "wcag2aa", "wcag21aa"], violations: scan.violations.map((item) => ({ id: item.id, impact: item.impact, help: item.help, helpUrl: item.helpUrl, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), incompleteRules: scan.incomplete.length };
          row.screenshot = await screenshot(page, `${nameFor(route)}-${viewport.width}.png`);
          if (["/", "/mobile"].includes(route)) row.firstViewport = await screenshot(page, `${nameFor(route)}-${viewport.width}-first-viewport.png`, false);
          assert.equal(row.accessibility.violations.length, 0, "automated WCAG violations");
          assert.deepEqual(row.pageErrors, [], "no uncaught page errors");
          row.unexpectedConsole = row.console.filter((message) => !(route === "/404" && /404/.test(message.text) && normalize(message.path) === "/404"));
          assert.deepEqual(row.unexpectedConsole, [], "no unexpected console errors/warnings");
          assert.ok(row.httpErrors.every((item) => route === "/404" && item.status === 404 && item.resourceType === "document"), "no failed asset or data requests");
          row.result = "passed";
        } catch (error) { row.result = "failed"; row.error = error.message; failures++; if (!row.screenshot) { try { row.screenshot = await screenshot(page, `${nameFor(route)}-${viewport.width}-failed.png`); } catch {} } }
        report.captures.push(row);
        console.log(`CAPTURE ${route} ${viewport.width}: ${row.result}${row.error ? ` (${row.error})` : ""}`);
      }
    }
    active = { pageErrors: [], console: [], httpErrors: [] };
    await record("Homepage preview search, empty recovery, navigation and keyboard FAQ", async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await load("/");
      const preview = page.getByRole("region", { name: "Interactive product preview with illustrative data" });
      await preview.getByRole("button", { name: "Documents", exact: true }).click();
      const search = preview.getByRole("textbox", { name: "Search sample documents" });
      await search.fill("financial"); await preview.getByText("Financial model.xlsx", { exact: true }).waitFor();
      assert.equal(await preview.getByText("Pitch deck.pdf", { exact: true }).count(), 0);
      await preview.getByText("Financial model.xlsx", { exact: true }).scrollIntoViewIfNeeded();
      const filtered = await screenshot(page, "home-1440-preview-filtered.png", false);
      await search.fill("roomline-no-matches"); await preview.getByText(/No sample files match/).waitFor();
      await preview.getByText(/No sample files match/).scrollIntoViewIfNeeded();
      const empty = await screenshot(page, "home-1440-preview-empty.png", false);
      await preview.getByRole("button", { name: "Clear search", exact: true }).click(); await preview.getByText("Pitch deck.pdf", { exact: true }).waitFor();
      await preview.getByRole("button", { name: "Shared links", exact: true }).click(); await preview.getByRole("heading", { name: "Investor access" }).waitFor();
      await preview.getByRole("button", { name: "Visitors", exact: true }).click(); await preview.getByText("Illustrative events", { exact: true }).waitFor();
      const activity = await screenshot(page, "home-1440-preview-activity.png", false);
      const faq = page.getByRole("button", { name: "What belongs in a data room?", exact: true });
      await faq.focus(); await page.keyboard.press("Enter"); assert.equal(await faq.getAttribute("aria-expanded"), "true");
      const faqOpen = await screenshot(page, "home-1440-faq-open.png", false);
      await page.keyboard.press("Enter"); assert.equal(await faq.getAttribute("aria-expanded"), "false");
      return { screenshots: [filtered, empty, activity, faqOpen], observed: "Filtering changed visible sample files; empty state recovered; links/activity tabs changed; Enter opened and closed FAQ." };
    });
    await record("Mobile menu opens by keyboard, closes with Escape/focus restoration and navigation", async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await load("/");
      const summary = page.locator("header summary"); await summary.focus(); await page.keyboard.press("Enter");
      const menu = page.getByRole("navigation", { name: "Mobile navigation" }); await menu.waitFor({ state: "visible" });
      const open = await screenshot(page, "home-390-menu-open.png", false);
      await page.keyboard.press("Escape"); assert.equal(await summary.evaluate((node) => node.parentElement.open), false);
      assert.equal(await summary.evaluate((node) => node === document.activeElement), true);
      await summary.click(); await menu.getByRole("link", { name: "Product", exact: true }).click();
      await page.waitForURL((url) => normalize(url.pathname) === "/product");
      assert.equal(await page.locator("header details").evaluate((node) => node.open), false);
      return { screenshots: [open], observed: "Keyboard menu opened; Escape closed/restored focus; Product navigation stayed local and closed the menu." };
    });
    await record("Unknown static path uses custom404 and all interactions remain client-only", async () => {
      const response = await load("/roomline-static-missing-page"); assert.equal(response.status(), 404);
      await page.getByRole("heading", { name: "Page not found.", exact: true }).waitFor();
      assert.deepEqual(active.pageErrors, []); assert.deepEqual(report.privateRequests, []); assert.deepEqual(report.foreignRequestsBlocked, []);
      const unexpected = active.console.filter((message) => !(/404/.test(message.text) && normalize(message.path) === "/roomline-static-missing-page"));
      report.interactionDiagnostics = active;
      assert.deepEqual(unexpected, [], "no unexpected interaction console warnings/errors");
      assert.ok(active.httpErrors.every((item) => item.path === "/roomline-static-missing-page" && item.status === 404 && item.resourceType === "document"), "no failed interaction assets/data");
      return { observed: "Custom404 rendered; no API/auth/backend request or foreign-origin navigation occurred." };
    });
    report.finalCookies = (await context.cookies()).map((cookie) => ({ name: cookie.name, domain: cookie.domain }));
    assert.equal(report.finalCookies.length, 0, "static marketing must not acquire an authenticated cookie");
    report.summary = { captures: report.captures.length, captureFailures: report.captures.filter((row) => row.result !== "passed").length, interactions: report.interactions.length, interactionFailures: report.interactions.filter((row) => row.result !== "passed").length, foreignRequests: report.foreignRequestsBlocked.length, privateRequests: report.privateRequests.length };
  } catch (error) { failures++; report.fatalError = error.message; }
  finally {
    if (context) await context.close(); if (browser) await browser.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    report.result = failures ? "failed" : "passed";
    await fsp.writeFile(path.join(OUTPUT, "report.json"), JSON.stringify(report, null, 2) + "\n");
    const rows = report.captures.map((row) => `| ${row.route} | ${row.viewport.width} | ${row.result} | ${row.accessibility?.violations.length ?? "not run"} | ${row.screenshot?.path ?? "unavailable"} |`);
    await fsp.writeFile(path.join(OUTPUT, "REPORT.md"), `# Static marketing browser verification\n\nGenerated ${report.generatedAt}. Result: **${report.result}**. Built artifact ${build.builtAt}, digest \`${build.sourceDigest}\`.\n\nOne isolated headless Chromium context visited only ${ORIGIN}; foreign and API/auth/backend requests were blocked and reported. No Next server, build, compiler, provider write, app navigation, login or email was used.\n\n| Route | Width | Result | Axe violations | Screenshot |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\n${report.interactions.map((row) => `- ${row.name}: ${row.result}${row.error ? ` — ${row.error}` : ""}`).join("\n")}\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n`);
    console.log(`Static marketing browser result: ${report.result}; report ${publicPath(path.join(OUTPUT, "report.json"))}`);
    process.exitCode = failures ? 1 : 0;
  }
}

main().catch((error) => { console.error("Static marketing browser check could not start:", error.message); process.exitCode = 1; });
