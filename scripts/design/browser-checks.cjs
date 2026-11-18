#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const origin = process.env.DESIGN_BASE_URL || "http://localhost:3000";
const output = "artifacts/revamp/after";
const routes = [
  "/",
  "/product",
  "/security",
  "/solutions/fundraising",
  "/solutions/due-diligence",
  "/guides",
  "/guides/fundraising-checklist",
  "/guides/sharing-checklist",
  "/login",
  "/register",
  "/auth/email",
  "/404",
  "/design-system",
];
const report = {
  generatedAt: new Date().toISOString(),
  origin,
  captures: [],
  interactions: [],
  limitations: [
    "Headless Chromium is not a physical mobile-device test.",
    "Sample preview and mocked registration checks do not verify server access, email delivery, or credential exchange.",
    "Authenticated room routes remain blocked by inherited missing source and unconfigured services.",
  ],
};
fs.mkdirSync(output, { recursive: true });
let failures = 0;
function record(name, callback) {
  return callback()
    .then(() => {
      report.interactions.push({ name, status: "passed" });
      console.log("PASS", name);
    })
    .catch((error) => {
      failures++;
      report.interactions.push({
        name,
        status: "failed",
        error: error.message,
      });
      console.error("FAIL", name, error.message);
    });
}
async function load(page, route) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await page.goto(new URL(route, origin).href, {
        waitUntil: "networkidle",
        timeout: 120000,
      });
      if (response) return response;
    } catch (error) {
      if (attempt) throw error;
    }
  }
  throw new Error(`No navigation response for ${route}`);
}
(async () => {
  const executable = process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    for (const width of [1440, 390])
      for (const route of routes) {
        const row = {
          route,
          state: "default",
          theme: "light",
          viewport: { width, height: 1000 },
        };
        const errors = [];
        const errorListener = (error) => errors.push(error.message);
        page.on("pageerror", errorListener);
        try {
          await page.setViewportSize({ width, height: 1000 });
          await page.addInitScript(() =>
            localStorage.setItem("theme", "light"),
          );
          const response = await load(page, route);
          row.status = response.status();
          row.finalPath = new URL(page.url()).pathname;
          assert.equal(row.status, route === "/404" ? 404 : 200);
          assert.equal(row.finalPath, route);
          assert.equal(await page.locator("h1").count(), 1, "one page heading");
          assert.equal(
            await page.locator("main").count(),
            1,
            "one main landmark",
          );
          const size = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(
            size.scroll <= size.width,
            `page overflow ${JSON.stringify(size)}`,
          );
          const scan = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          row.accessibility = scan.violations.map((item) => ({
            id: item.id,
            impact: item.impact,
            nodes: item.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          }));
          assert.equal(
            row.accessibility.length,
            0,
            "automated accessibility violations",
          );
          assert.deepEqual(errors, [], "page errors");
          const filename =
            (route === "/" ? "home" : route.slice(1).replaceAll("/", "-")) +
            `-${width}.png`;
          row.screenshot = path.posix.join(output, filename);
          await page.screenshot({ path: row.screenshot, fullPage: true });
          row.result = "passed";
        } catch (error) {
          row.result = "failed";
          row.error = error.message;
          failures++;
        } finally {
          page.off("pageerror", errorListener);
        }
        report.captures.push(row);
        console.log("CAPTURE", route, width, row.result, row.error || "");
      }
    await record(
      "Preview navigation, search, empty recovery and FAQ keyboard",
      async () => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await load(page, "/");
        const preview = page.getByRole("region", {
          name: "Interactive product preview with illustrative data",
        });
        await preview
          .getByRole("button", { name: "Documents", exact: true })
          .click();
        await preview
          .getByRole("textbox", { name: "Search sample documents" })
          .fill("financial");
        assert.equal(
          await preview.getByText("Pitch deck.pdf", { exact: true }).count(),
          0,
        );
        await preview
          .getByRole("textbox", { name: "Search sample documents" })
          .fill("no-match");
        await preview.getByRole("button", { name: "Clear search" }).click();
        await preview.getByText("Pitch deck.pdf", { exact: true }).waitFor();
        await preview
          .getByRole("button", { name: "Shared links", exact: true })
          .click();
        await preview
          .getByRole("heading", { name: "Investor access" })
          .waitFor();
        await preview
          .getByRole("button", { name: "Visitors", exact: true })
          .click();
        await preview.getByText("Illustrative events").waitFor();
        const faq = page.getByRole("button", {
          name: "What belongs in a data room?",
        });
        await faq.focus();
        await page.keyboard.press("Enter");
        assert.equal(await faq.getAttribute("aria-expanded"), "true");
      },
    );
    await record(
      "Responsive reflow at320,768,1024,1728 and mobile menu keyboard",
      async () => {
        for (const width of [320, 768, 1024, 1728]) {
          await page.setViewportSize({ width, height: 1000 });
          await load(page, "/");
          const size = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          assert.ok(size.scroll <= size.width, `overflow at${width}`);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await load(page, "/");
        const summary = page.locator("header summary");
        await summary.focus();
        await page.keyboard.press("Enter");
        await page
          .getByRole("navigation", { name: "Mobile navigation" })
          .waitFor();
        await page.keyboard.press("Escape");
        assert.equal(
          await summary.evaluate((element) => element.parentElement.open),
          false,
        );
        assert.equal(
          await summary.evaluate(
            (element) => element === document.activeElement,
          ),
          true,
        );
      },
    );
    await record("Reduced motion preserves content and controls", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await load(page, "/");
      await page.getByRole("heading", { level: 1 }).waitFor();
      const faq = page.getByRole("button", {
        name: "Can I try the product preview?",
      });
      await faq.click();
      assert.equal(await faq.getAttribute("aria-expanded"), "true");
    });
    await record(
      "Registration failure recovery and code entry with mocked NextAuth",
      async () => {
        let success = false,
          submitted;
        await page.route("**/api/auth/**", async (route) => {
          const pathname = new URL(route.request().url()).pathname;
          let data = null;
          if (pathname === "/api/auth/providers")
            data = {
              email: {
                id: "email",
                name: "Email",
                type: "email",
                signinUrl: `${origin}/api/auth/signin/email`,
                callbackUrl: `${origin}/api/auth/callback/email`,
              },
            };
          if (pathname === "/api/auth/csrf")
            data = { csrfToken: "design-test-csrf" };
          if (pathname === "/api/auth/signin/email") {
            submitted = new URLSearchParams(route.request().postData());
            data = {
              url: success
                ? `${origin}/auth/email`
                : `${origin}/login?error=EmailSignin`,
            };
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        });
        await load(page, "/register?next=%2Fdatarooms");
        const email = page.getByRole("textbox", { name: "Work email" });
        await email.fill("Founder@Example.Test");
        await page.getByRole("button", { name: "Continue with Email" }).click();
        await page
          .getByRole("alert")
          .filter({ hasText: "Unable to send your code" })
          .waitFor();
        assert.equal(await email.inputValue(), "Founder@Example.Test");
        assert.equal(
          await page
            .getByRole("button", { name: "Continue with Email" })
            .isEnabled(),
          true,
        );
        success = true;
        await page.getByRole("button", { name: "Continue with Email" }).click();
        await page.waitForURL("**/auth/email");
        await page.getByText("founder@example.test", { exact: true }).waitFor();
        assert.equal(submitted.get("email"), "founder@example.test");
        assert.equal(submitted.get("callbackUrl"), "/datarooms");
        await page.unroute("**/api/auth/**");
      },
    );
    await context.close();
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, "browser-report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
