import assert from "node:assert/strict";
import test from "node:test";
import { render } from "react-email";

import { Footer } from "./shared/footer";
import VerificationCodeEmail from "./verification-link";

test("rendered login email identifies Roomline without upstream brand or address", async () => {
  const html = await render(
    VerificationCodeEmail({
      email: "recipient@owned.example",
      code: "OWNED12345",
    }),
  );
  assert.match(html, /Roomline/);
  assert.match(html, /OWNED12345/);
  assert.match(html, /recipient@owned\.example/);
  assert.doesNotMatch(
    html,
    /Papermark|papermark\.com|Governors Ave|Marc Seitz/,
  );
});

test("transactional footer omits an unconfigured postal address", async () => {
  const html = await render(Footer({ withAddress: true, postalAddress: "" }));
  assert.match(html, /Roomline/);
  assert.doesNotMatch(html, /Papermark|Governors Ave|Dover/);
});

test("marketing footer requires configured address and unsubscribe destination", async () => {
  assert.throws(
    () => Footer({ marketing: true, postalAddress: "", unsubscribeUrl: "" }),
    /requires an owned postal address/,
  );
  const html = await render(
    Footer({
      marketing: true,
      postalAddress: "Owned postal address",
      unsubscribeUrl: "https://owned.example/email/preferences",
    }),
  );
  assert.match(html, /Owned postal address/);
  assert.match(html, /https:\/\/owned\.example\/email\/preferences/);
  assert.doesNotMatch(html, /once a month|Papermark/);
});
