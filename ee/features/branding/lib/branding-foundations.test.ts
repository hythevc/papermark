import assert from "node:assert/strict";
import { test } from "node:test";

import { autoFillHasBrandAssets } from "./auto-fill-result";
import { resolveBrandLogo } from "./brand-logo";
import { classifyDataroomBanner } from "./dataroom-banner";
import {
  asDataroomCardLayout,
  asDataroomViewerHeaderStyle,
  inferDataroomViewerLayoutPreset,
} from "./dataroom-viewer-layout";
import {
  inheritsTeamBrand,
  resolveDisplayedDataroomBrand,
} from "./resolve-dataroom-displayed-brand";
import { resolvePublicLinkMeta } from "./resolve-public-link-meta";
import { parseBrandingPreviewParams } from "./use-branding-preview-params";
import { logoToneFromPixels } from "./use-logo-tone";

test("explicit logo hiding overrides custom media; unsafe sources never become img URLs", () => {
  assert.deepEqual(
    resolveBrandLogo({
      hideLogo: true,
      logo: "https://assets.example/logo.png",
    }),
    { kind: "none" },
  );
  assert.deepEqual(
    resolveBrandLogo({
      hideLogo: false,
      logo: "https://assets.example/logo.png",
    }),
    { kind: "custom", src: "https://assets.example/logo.png" },
  );
  assert.deepEqual(resolveBrandLogo({ logo: "javascript:alert(1)" }), {
    kind: "papermark",
  });
  assert.deepEqual(resolveBrandLogo(null), { kind: "papermark" });
});
test("banner classification restricts embeds to exact YouTube hosts and known media", () => {
  assert.equal(classifyDataroomBanner("no-banner").kind, "none");
  assert.deepEqual(classifyDataroomBanner("https://youtu.be/dQw4w9WgXcQ?t=3"), {
    kind: "youtube",
    src: "https://youtu.be/dQw4w9WgXcQ?t=3",
    youtubeId: "dQw4w9WgXcQ",
  });
  assert.equal(
    classifyDataroomBanner(
      "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    ).kind,
    "image",
  );
  assert.equal(
    classifyDataroomBanner("https://assets.example/banner.mp4?token=sample")
      .kind,
    "video",
  );
  assert.equal(classifyDataroomBanner("javascript:alert(1)").kind, "none");
});
test("layout coercion and named presets do not claim arbitrary combinations are a preset", () => {
  assert.equal(asDataroomCardLayout("unsupported"), "LIST");
  assert.equal(asDataroomViewerHeaderStyle(null), "DEFAULT");
  assert.equal(
    inferDataroomViewerLayoutPreset({
      cardLayout: "COMPACT",
      showFolderTree: false,
      hideFolderIconsInMain: true,
      viewerHeaderStyle: "SPLIT",
    }),
    "MODERN",
  );
  assert.equal(
    inferDataroomViewerLayoutPreset({
      cardLayout: "COMPACT",
      showFolderTree: true,
      hideFolderIconsInMain: true,
      viewerHeaderStyle: "SPLIT",
    }),
    "CUSTOM",
  );
});
test("room-owned brand is independent; nullable hide alone inherits and false remains explicit", () => {
  assert.equal(inheritsTeamBrand({ hasDataroomBrand: true }), false);
  assert.equal(
    inheritsTeamBrand({ linkBrandId: "chosen", hasDataroomBrand: true }),
    true,
  );
  assert.deepEqual(
    resolveDisplayedDataroomBrand({
      teamBrand: { logo: "team", hideLogo: true },
      dataroomBrand: { logo: "room", hideLogo: null },
      inheritTeamBrand: false,
    }),
    { logo: "room", hideLogo: true },
  );
  assert.equal(
    resolveDisplayedDataroomBrand({
      teamBrand: { hideLogo: true },
      dataroomBrand: { hideLogo: false },
      inheritTeamBrand: false,
    })?.hideLogo,
    false,
  );
});
test("metadata honors enabled source precedence and strips executable media URLs", () => {
  const meta = resolvePublicLinkMeta({
    link: {
      enableCustomMetatag: true,
      metaTitle: "Link",
      metaImage: "javascript:alert(1)",
    },
    teamBrand: {
      customLinkPreviewEnabled: true,
      linkPreviewTitle: "Team",
      linkPreviewImage: "https://assets.example/preview.png",
    },
    defaultTitle: "Default",
  });
  assert.equal(meta.metaTitle, "Link");
  assert.equal(meta.metaImage, "https://assets.example/preview.png");
  assert.equal(
    resolvePublicLinkMeta({
      link: { enableCustomMetatag: false, metaTitle: "Disabled" },
      teamBrand: {
        customLinkPreviewEnabled: false,
        linkPreviewTitle: "Disabled",
      },
      defaultTitle: "Default",
    }).metaTitle,
    "Default",
  );
});
test("auto-fill does not report a successful asset lookup for a name alone", () => {
  assert.equal(autoFillHasBrandAssets({ name: "Example" }), false);
  assert.equal(
    autoFillHasBrandAssets(
      { banner: "https://assets.example/banner.png" },
      { allowBanner: false },
    ),
    false,
  );
  assert.equal(autoFillHasBrandAssets({ brandColor: "#123456" }), true);
});
test("logo tone ignores fully transparent pixels", () => {
  assert.equal(
    logoToneFromPixels(
      new Uint8ClampedArray([255, 255, 255, 0, 20, 20, 20, 255]),
    ),
    "dark",
  );
  assert.equal(
    logoToneFromPixels(new Uint8ClampedArray([255, 255, 255, 255])),
    "light",
  );
});
test("preview message payload parser whitelists keys and string values", () => {
  const result = parseBrandingPreviewParams({
    brandLogo: "https://assets.example/logo.png",
    hideLogo: true,
    unknown: "ignored",
  });
  assert.equal(result.brandLogo, "https://assets.example/logo.png");
  assert.equal(result.hideLogo, "0");
  assert.ok(!("unknown" in result));
});
test("standalone previews reject executable actions and malformed visual settings", () => {
  const result = parseBrandingPreviewParams({
    ctaUrl: "javascript:alert(document.domain)",
    brandLogo: "javascript:alert(1)",
    brandBanner: "file:///private/banner.png",
    cardLayout: "unsupported",
    viewerHeaderStyle: "unsupported",
    brandColor: "url(https://example.com/tracker)",
    defaultLanguage: "unsupported",
  });
  assert.equal(result.ctaUrl, "");
  assert.equal(result.brandLogo, "");
  assert.equal(result.brandBanner, "");
  assert.equal(result.cardLayout, "LIST");
  assert.equal(result.viewerHeaderStyle, "DEFAULT");
  assert.equal(result.brandColor, "#ffffff");
  assert.equal(result.defaultLanguage, "en");
});
