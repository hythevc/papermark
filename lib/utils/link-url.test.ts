import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { BRAND } from "@/lib/brand";
import {
  DEFAULT_LINK_HOST,
  LEGACY_DEFAULT_LINK_DOMAIN,
  constructAppUrl,
  constructLinkUrl,
  constructPreviewLinkUrl,
} from "@/lib/utils/link-url";

const app = "https://workspace.roomline.example";
const marketing = "https://roomline.example";

test("default links use the configured application rather than separate marketing", () => {
  assert.equal(constructLinkUrl({ id: "link-1" }, app), `${app}/view/link-1`);
  assert.notEqual(
    new URL(constructLinkUrl({ id: "link-1" }, app)).origin,
    marketing,
  );
  assert.equal(
    new URL(constructLinkUrl({ id: "link-1" })).origin,
    new URL(BRAND.appUrl).origin,
  );
  assert.equal(DEFAULT_LINK_HOST, new URL(BRAND.appUrl).host);
  assert.equal(
    constructLinkUrl({ id: "room/unsafe?query" }, app),
    `${app}/view/room%2Funsafe%3Fquery`,
  );
});

test("custom-domain links retain their own hostname and slug", () => {
  const custom = {
    id: "link-1",
    domainId: "domain-1",
    domainSlug: "deals.client.example",
    slug: "series-a",
  };
  assert.equal(
    constructLinkUrl(custom, app),
    "https://deals.client.example/series-a",
  );
  assert.equal(
    constructLinkUrl({ ...custom, domainId: undefined }, app),
    "https://deals.client.example/series-a",
  );
  assert.equal(
    constructLinkUrl({ ...custom, domainId: null }, app),
    `${app}/view/link-1`,
  );
  assert.equal(
    constructLinkUrl({ ...custom, slug: null }, app),
    `${app}/view/link-1`,
  );
});

test("owner previews stay on the app origin with safely encoded token query", () => {
  const url = new URL(
    constructPreviewLinkUrl("link-1", "token+value&next=foreign", app),
  );
  assert.equal(url.origin, app);
  assert.equal(url.pathname, "/view/link-1");
  assert.equal(
    url.searchParams.get("previewToken"),
    "token+value&next=foreign",
  );
  assert.equal(url.searchParams.size, 1);
});

test("internal application URLs cannot escape to another origin", () => {
  assert.equal(
    constructAppUrl("/settings/billing?tab=plan", app),
    `${app}/settings/billing?tab=plan`,
  );
  for (const unsafe of [
    "https://foreign.example/view/x",
    "//foreign.example/view/x",
    "/\\foreign.example/view/x",
    "settings/billing",
  ]) {
    assert.throws(() => constructAppUrl(unsafe, app));
  }
});

test("default domain display retains the legacy API sentinel without pretending it is a custom domain", () => {
  const section = readFileSync(
    "components/links/link-sheet/domain-section.tsx",
    "utf8",
  );
  assert.equal(LEGACY_DEFAULT_LINK_DOMAIN, "papermark.com");
  assert.match(section, /<SelectItem\s+value=\{LEGACY_DEFAULT_LINK_DOMAIN\}/);
  assert.match(section, /\{DEFAULT_LINK_HOST\}/);
  for (const file of [
    "pages/api/links/index.ts",
    "pages/api/links/[id]/index.ts",
  ]) {
    assert.match(readFileSync(file, "utf8"), /domain\s*===\s*"papermark\.com"/);
  }
});

test("viewer and account URL builders do not route app paths to the marketing origin", () => {
  const files = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const name = path.join(directory, entry.name);
      return entry.isDirectory()
        ? files(name)
        : /\.[jt]sx?$/.test(name) && !name.endsWith(".test.ts")
          ? [name]
          : [];
    });
  const offenders = ["components", "lib", "app", "pages"]
    .flatMap(files)
    .filter((file) =>
      /NEXT_PUBLIC_MARKETING_URL[^;\n]*(?:\/view\/|\/settings\/|\/datarooms\/|\/documents\/)/.test(
        readFileSync(file, "utf8"),
      ),
    );
  assert.deepEqual(offenders, []);
});
