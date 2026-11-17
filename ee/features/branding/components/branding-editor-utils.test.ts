import assert from "node:assert/strict";
import test from "node:test";

import {
  getBrandingPreviewPath,
  isBrandImageSource,
  parseBrandMediaUrl,
  validateBrandImageFile,
} from "./branding-editor-utils";

test("brand image files reject empty, oversized and unsupported payloads before FileReader runs", () => {
  assert.equal(validateBrandImageFile({ type: "image/png", size: 100 }), null);
  assert.equal(
    validateBrandImageFile({ type: "image/vnd.microsoft.icon", size: 100 }),
    null,
  );
  assert.equal(
    validateBrandImageFile({ type: "image/jpeg", size: 2 * 1024 * 1024 }),
    null,
  );
  assert.match(
    validateBrandImageFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 }) ??
      "",
    /smaller than/,
  );
  assert.match(
    validateBrandImageFile({ type: "image/png", size: 0 }) ?? "",
    /empty/,
  );
  assert.notEqual(
    validateBrandImageFile({ type: "text/html", size: 100 }),
    null,
  );
  assert.notEqual(
    validateBrandImageFile({ type: "image/svg+xml", size: 100 }),
    null,
  );
});

test("brand image previews reject executable schemes and protocol-relative or credentialed URLs", () => {
  for (const value of [
    "https://owned.example/image.png",
    "/_static/image.png",
    "blob:https://owned.example/local-preview",
    "data:image/png;base64,aGVsbG8=",
  ])
    assert.equal(isBrandImageSource(value), true, value);
  for (const value of [
    null,
    undefined,
    "",
    "javascript:alert(1)",
    "//other.example/image.png",
    "/\\other.example/image.png",
    "data:text/html;base64,aGVsbG8=",
    "data:image/svg+xml;base64,aGVsbG8=",
    "https://user:password@other.example/image.png",
  ])
    assert.equal(isBrandImageSource(value), false, String(value));
});

test("pasted media accepts complete HTTP(S) sources without fetching or pretending to upload them", () => {
  assert.equal(
    parseBrandMediaUrl(" https://owned.example/banner.mp4 "),
    "https://owned.example/banner.mp4",
  );
  assert.equal(
    parseBrandMediaUrl("https://youtu.be/dQw4w9WgXcQ"),
    "https://youtu.be/dQw4w9WgXcQ",
  );
  for (const value of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "//other.example/image",
    "/local/image",
    "https://user:password@other.example/image",
  ])
    assert.equal(parseBrandMediaUrl(value), null);
});

test("iframe previews can load only the intended local preview routes", () => {
  for (const value of [
    "/room_ppreview_demo",
    "/nav_ppreview_demo",
    "/entrance_ppreview_demo",
  ])
    assert.equal(getBrandingPreviewPath(value), value);
  for (const value of [
    "https://other.example",
    "//other.example",
    "/api/teams/team",
    "/room_ppreview_demo?external=1",
    "/room_ppreview_demo/../settings",
  ])
    assert.equal(getBrandingPreviewPath(value), null);
});
