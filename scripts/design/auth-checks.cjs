#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const origin = process.env.DESIGN_BASE_URL || "http://localhost:3000";
(async () => {
  const executable = process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const b = await chromium.launch({
    headless: true,
    ...(fs.existsSync(executable) ? { executablePath: executable } : {}),
    args: ["--no-sandbox"],
  });
  const results = [];
  try {
    const c = await b.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
    });
    const p = await c.newPage();
    await p.addInitScript(() => localStorage.setItem("theme", "dark"));
    let mode = "network",
      verifyCalls = 0,
      submitted;
    await p.route("**/api/auth/**", async (route) => {
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
        data = { csrfToken: "local-test-csrf" };
      if (pathname === "/api/auth/signin/email") {
        submitted = new URLSearchParams(route.request().postData());
        if (mode === "network") {
          await route.abort("failed");
          return;
        }
        data = {
          url:
            mode === "denied"
              ? `${origin}/login?error=EmailSignin`
              : `${origin}/auth/email`,
        };
      }
      if (pathname === "/api/auth/verify-code") {
        verifyCalls++;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid code" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await p.goto(`${origin}/login`, { waitUntil: "networkidle" });
    const loginEmail = p.getByRole("textbox", { name: "Email", exact: true });
    await loginEmail.fill("Founder@Example.Test");
    await p
      .getByRole("button", { name: "Continue with Email", exact: true })
      .click();
    await p
      .getByText("Unable to connect. Check your connection and try again.", {
        exact: true,
      })
      .waitFor();
    assert.equal(await loginEmail.inputValue(), "Founder@Example.Test");
    assert.equal(await loginEmail.isEnabled(), true);
    assert.equal(
      await p
        .getByRole("button", { name: "Continue with Email", exact: true })
        .isEnabled(),
      true,
    );
    results.push({
      name: "login network failure preserves input and restores controls",
      status: "passed",
    });
    for (const width of [1440, 390]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.goto(`${origin}/register?next=%2Fdatarooms`, {
        waitUntil: "networkidle",
      });
      assert.equal(await p.locator("main").count(), 1);
      const email = p.getByRole("textbox", { name: "Work email", exact: true });
      await email.fill("Founder@Example.Test");
      mode = "denied";
      await p
        .getByRole("button", { name: "Continue with Email", exact: true })
        .click();
      await p.getByRole("alert").waitFor();
      assert.equal(await email.inputValue(), "Founder@Example.Test");
      await p.screenshot({
        path: `artifacts/revamp/after/register-error-${width}.png`,
        fullPage: true,
      });
      mode = "success";
      await p
        .getByRole("button", { name: "Continue with Email", exact: true })
        .click();
      await p.waitForURL("**/auth/email");
      await p.getByText("founder@example.test", { exact: true }).waitFor();
      assert.equal(submitted.get("callbackUrl"), "/datarooms");
      await p.screenshot({
        path: `artifacts/revamp/after/code-entry-${width}.png`,
        fullPage: true,
      });
      const code = p.getByRole("textbox", { name: "Verification Code" });
      await code.fill("123");
      assert.equal(
        await p
          .getByRole("button", { name: "Verify", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(verifyCalls, 0);
      await code.fill("ABCDEFGHIJ");
      await p.getByRole("button", { name: "Verify", exact: true }).click();
      await p
        .getByRole("heading", { level: 1, name: "Request a new code" })
        .waitFor();
      assert.equal(
        await p
          .getByRole("link", { name: "Request a new code" })
          .getAttribute("href"),
        "/login",
      );
      await p.screenshot({
        path: `artifacts/revamp/after/code-expired-${width}.png`,
        fullPage: true,
      });
      verifyCalls = 0;
      results.push({
        name: `registration retry, callback, code constraints and expired recovery at${width}`,
        status: "passed",
      });
    }
  } catch (error) {
    results.push({ status: "failed", error: error.message });
    process.exitCode = 1;
  } finally {
    await b.close();
    fs.mkdirSync("artifacts/revamp/after", { recursive: true });
    fs.writeFileSync(
      "artifacts/revamp/after/auth-report.json",
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: "mocked APIs only; no email sent or credentials exchanged",
          results,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(results);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
