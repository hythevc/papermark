import assert from "node:assert/strict";
import test from "node:test";

import {
  isMarketingPathname,
  isMarketingRouteTemplate,
} from "./marketing-routes";

test("public content routes cover the marketing journey and valid content slugs", () => {
  for (const path of [
    "/",
    "/product",
    "/product/",
    "/security",
    "/guides",
    "/solutions/fundraising",
    "/solutions/due-diligence",
    "/guides/sharing-checklist",
    "/design-system",
    "/404",
  ]) {
    assert.equal(isMarketingPathname(path), true, path);
  }
});
test("marketing route handling does not expose app, API, or deeper private paths", () => {
  for (const path of [
    "/dashboard",
    "/datarooms",
    "/datarooms/private/documents",
    "/settings/security",
    "/api/teams",
    "/productivity",
    "/guides/private/settings",
    "/solutions/../settings",
    "/solutions/%2e%2e",
    "//evil.example",
    "/guides/[slug]",
  ]) {
    assert.equal(isMarketingPathname(path), false, path);
  }
});
test("router templates are separate from public request path matching", () => {
  assert.equal(isMarketingRouteTemplate("/guides/[slug]"), true);
  assert.equal(isMarketingRouteTemplate("/solutions/[slug]"), true);
  assert.equal(isMarketingRouteTemplate("/datarooms/[id]"), false);
});
