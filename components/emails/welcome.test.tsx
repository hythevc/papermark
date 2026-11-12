import assert from "node:assert/strict";
import test from "node:test";
import { render } from "react-email";

import WelcomeEmail from "./welcome";

test("welcome marketing footer uses its caller URL without a global unsubscribe setting", async () => {
  const oldAddress = process.env.EMAIL_POSTAL_ADDRESS;
  const oldUrl = process.env.EMAIL_MARKETING_UNSUBSCRIBE_URL;
  process.env.EMAIL_POSTAL_ADDRESS = "Owned business postal address";
  delete process.env.EMAIL_MARKETING_UNSUBSCRIBE_URL;
  try {
    const html = await render(
      WelcomeEmail({
        name: "Review",
        unsubscribeUrl: "https://owned.example/account/general",
      }),
    );
    assert.match(html, /Roomline/);
    assert.doesNotMatch(html, /Papermark|papermark\.com|Marc Seitz|Iuliia/);
    assert.match(html, /\/dashboard/);
    assert.match(html, /Owned business postal address/);
    assert.match(html, /Unsubscribe or update your preferences/);
    assert.match(html, /href="https:\/\/owned\.example\/account\/general"/);
  } finally {
    if (oldAddress === undefined) delete process.env.EMAIL_POSTAL_ADDRESS;
    else process.env.EMAIL_POSTAL_ADDRESS = oldAddress;
    if (oldUrl === undefined)
      delete process.env.EMAIL_MARKETING_UNSUBSCRIBE_URL;
    else process.env.EMAIL_MARKETING_UNSUBSCRIBE_URL = oldUrl;
  }
});
