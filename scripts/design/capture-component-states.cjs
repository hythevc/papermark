#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const origin = process.env.DESIGN_BASE_URL || "http://localhost:3000";
const output = "artifacts/revamp/after";
const states = [
  "default",
  "dialog-open",
  "sheet-open",
  "loading",
  "error",
  "empty",
];
const viewports = [
  { width: 1440, height: 1000 },
  { width: 390, height: 1000 },
];

async function settleAnimations(page) {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect?.getComputedTiming().iterations !== Infinity,
      );
    await Promise.all(
      finite.map((animation) => animation.finished.catch(() => {})),
    );
  });
}

async function captureStates() {
  fs.mkdirSync(output, { recursive: true });
  const executablePath =
    process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(executablePath) ? { executablePath } : {}),
    args: ["--no-sandbox"],
  });
  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    captureMethod:
      "Actual local design-system route in headless Chromium; page controls used to select each state.",
    limitations: [
      "Viewport emulation is not a physical mobile-device test.",
      "All content is the component reference's sample data; no live workspace or backend behavior is verified.",
      "Screenshot status remains captured-unreviewed until a saved image is inspected.",
    ],
    captures: [],
  };
  let failures = 0;
  try {
    for (const viewport of viewports)
      for (const theme of ["light", "dark"]) {
        const mobile = viewport.width < 600;
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
          isMobile: mobile,
          hasTouch: mobile,
          colorScheme: theme,
        });
        const page = await context.newPage();
        const pageErrors = [];
        const nonReadRequests = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("request", (request) => {
          if (!["GET", "HEAD", "OPTIONS"].includes(request.method()))
            nonReadRequests.push({
              method: request.method(),
              pathname: new URL(request.url()).pathname,
            });
        });
        try {
          const response = await page.goto(
            new URL("/design-system", origin).href,
            { waitUntil: "networkidle", timeout: 120_000 },
          );
          assert.equal(response.status(), 200);
          assert.equal(new URL(page.url()).pathname, "/design-system");
          await page.locator(`#ds-theme-${theme}`).click();
          await page.waitForFunction(
            (selectedTheme) =>
              document.documentElement.classList.contains(selectedTheme),
            theme,
          );
          await page.evaluate(() => document.fonts.ready);

          for (const state of states) {
            const filename = `component-${state}-${theme}-${viewport.width}.png`;
            const row = {
              route: "/design-system",
              state,
              theme,
              viewport,
              screenshot: path.posix.join(output, filename),
              status: "pending",
            };
            try {
              if (state === "default") {
                await page.evaluate(() => window.scrollTo(0, 0));
              } else if (state === "dialog-open" || state === "sheet-open") {
                const overlay = state === "dialog-open" ? "dialog" : "sheet";
                await page.locator(`#ds-${overlay}-trigger`).click();
                await page
                  .locator(`#ds-${overlay}`)
                  .waitFor({ state: "visible" });
                await settleAnimations(page);
                assert.equal(
                  await page.locator(`#ds-${overlay}`).getAttribute("role"),
                  "dialog",
                );
                const bounds = await page
                  .locator(`#ds-${overlay}`)
                  .boundingBox();
                assert.ok(
                  bounds.x >= -1 &&
                    bounds.y >= -1 &&
                    bounds.x + bounds.width <= viewport.width + 1 &&
                    bounds.y + bounds.height <= viewport.height + 1,
                  "overlay must fit viewport",
                );
              } else {
                await page.locator(`#ds-state-${state}`).click();
                await page
                  .locator(`#ds-${state}-card`)
                  .waitFor({ state: "visible" });
                await page.locator("#states").evaluate((element) => {
                  const header = document
                    .querySelector("header")
                    .getBoundingClientRect().height;
                  window.scrollTo(
                    0,
                    element.getBoundingClientRect().top +
                      window.scrollY -
                      header -
                      16,
                  );
                });
              }
              await page.evaluate(
                () =>
                  new Promise((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve)),
                  ),
              );
              await settleAnimations(page);
              const dimensions = await page.evaluate(() => ({
                viewport: innerWidth,
                scroll: document.documentElement.scrollWidth,
              }));
              assert.ok(
                dimensions.scroll <= dimensions.viewport,
                `horizontal overflow ${JSON.stringify(dimensions)}`,
              );
              const accessibility = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze();
              row.a11y = {
                checked: true,
                status: accessibility.violations.length ? "failed" : "passed",
                violations: accessibility.violations.map(
                  ({ id, impact, nodes }) => ({
                    id,
                    impact,
                    nodes: nodes.map(({ target, failureSummary }) => ({
                      target,
                      failureSummary,
                    })),
                  }),
                ),
              };
              row.pageErrors = [...pageErrors];
              row.nonReadRequests = [...nonReadRequests];
              assert.deepEqual(pageErrors, [], "no uncaught page errors");
              assert.deepEqual(
                nonReadRequests,
                [],
                "component reference must not send API writes",
              );
              await page.screenshot({
                path: row.screenshot,
                fullPage: state === "default",
                animations: "disabled",
              });
              row.status = "captured-unreviewed";
              row.captureArea = state === "default" ? "full-page" : "viewport";
              if (row.a11y.status === "failed") failures++;
              console.log(
                "CAPTURE",
                state,
                theme,
                viewport.width,
                row.a11y.status,
              );
            } catch (error) {
              row.status = "failed";
              row.error = error.message;
              failures++;
              console.error(
                "FAILED",
                state,
                theme,
                viewport.width,
                error.message,
              );
            } finally {
              report.captures.push(row);
              if (state === "dialog-open" || state === "sheet-open") {
                const overlay = state === "dialog-open" ? "dialog" : "sheet";
                await page.keyboard.press("Escape");
                await page
                  .locator(`#ds-${overlay}`)
                  .waitFor({ state: "hidden" });
                await page.waitForFunction(
                  (id) => document.activeElement?.id === id,
                  `ds-${overlay}-trigger`,
                );
              }
            }
          }
        } finally {
          await context.close();
        }
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, "component-state-captures.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  if (failures) process.exitCode = 1;
}

captureStates().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
