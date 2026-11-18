import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PWA_ASSET_PATHS,
  isPublicPwaAssetPathname,
  isPwaApplicationHost,
  isPwaApplicationOrigin,
} from "./pwa";

const config = {
  appUrl: "https://app.roomline.example",
  apiHost: "api.roomline.example",
  mcpHost: "mcp.roomline.example",
  webhookHost: "hooks.roomline.example",
};

test("PWA eligibility is exact to the configured application origin", () => {
  assert.equal(isPwaApplicationHost("app.roomline.example", config), true);
  assert.equal(isPwaApplicationHost("APP.ROOMLINE.EXAMPLE", config), true);
  assert.equal(
    isPwaApplicationOrigin("https://app.roomline.example", config),
    true,
  );
  for (const origin of [
    "http://app.roomline.example",
    "https://roomline.example",
    "https://customer.example",
    "https://app.roomline.example.evil.example",
    "https://api.roomline.example",
    "https://mcp.roomline.example",
    "https://hooks.roomline.example",
    "https://app.roomline.example:444",
    "https://user@app.roomline.example",
    "https://app.roomline.example/path",
    "https://app.roomline.example?query=1",
    "https://app.roomline.example\\@evil.example",
  ])
    assert.equal(isPwaApplicationOrigin(origin, config), false, origin);
});
test("isolated API/MCP/webhook hosts can never register even if misconfigured as the app origin", () => {
  for (const key of ["apiHost", "mcpHost", "webhookHost"] as const)
    assert.equal(
      isPwaApplicationOrigin(config.appUrl, {
        ...config,
        [key]: "app.roomline.example",
      }),
      false,
      key,
    );
});
test("local registration requires the configured localhost port and protocol", () => {
  const local = { appUrl: "http://localhost:3000" };
  assert.equal(isPwaApplicationHost("localhost:3000", local), true);
  assert.equal(isPwaApplicationOrigin("http://localhost:3000", local), true);
  assert.equal(isPwaApplicationHost("localhost:3001", local), false);
  assert.equal(isPwaApplicationOrigin("http://127.0.0.1:3000", local), false);
  assert.equal(isPwaApplicationOrigin("https://localhost:3000", local), false);
});
test("public installation routes use an exact allowlist with no workspace/static wildcards", () => {
  for (const path of PWA_ASSET_PATHS)
    assert.equal(isPublicPwaAssetPathname(path), true, path);
  for (const path of [
    "/sw.js/",
    "/sw.js/../api/teams",
    "/manifest.webmanifest/",
    "/icons/private.pdf",
    "/icons/roomline-192.png/extra",
    "/offline",
    "/datarooms",
    "/api/teams",
    "/_next/data/private.json",
    "/_static/sample.pdf",
    "/view/private",
    "/auth/email",
    "/download/private",
  ])
    assert.equal(isPublicPwaAssetPathname(path), false, path);
});
