#!/usr/bin/env node
/** Refresh current source/evidence bookkeeping; never infers visual passes. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateSourceDigest } from "./check.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) =>
  JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const target = "artifacts/revamp/review-manifest.json";
const manifest = read(target);
const inventoryPath = "docs/roomline/revamp/SCREEN_INVENTORY.json";
const inventory = read(inventoryPath);
const evidence = manifest.evidence;
function addEvidence(relative, kind = "report") {
  const existing = evidence.find((entry) => entry.path === relative);
  if (existing) return existing.id;
  const entry = { id: `runtime-e${evidence.length + 1}`, kind, path: relative };
  if (kind === "screenshot") {
    const bytes = fs.readFileSync(path.join(root, relative));
    entry.width = bytes.readUInt32BE(16);
    entry.height = bytes.readUInt32BE(20);
  }
  evidence.push(entry);
  return entry.id;
}
const reportPaths = {
  runtime: "artifacts/runtime/README.md",
  verification: "artifacts/runtime/final-verification.json",
  core: "artifacts/runtime/core-local.json",
  extended: "artifacts/runtime/extended-local.json",
  marketing: "artifacts/runtime/marketing/report.json",
  pwa: "artifacts/revamp/pwa/browser-report.json",
  inventory: inventoryPath,
  deployment: "DEPLOYMENT.md",
};
const ids = Object.fromEntries(
  Object.entries(reportPaths).map(([key, value]) => [key, addEvidence(value)]),
);
const retained = manifest.surfaces.filter(
  (surface) =>
    surface.status === "rendered" && !surface.id.startsWith("runtime-"),
);
for (const surface of retained) {
  if (!surface.reason.startsWith("Historical 14 November"))
    surface.reason = `Historical 14 November 2026 browser evidence; source has subsequently been restored. ${surface.reason}`;
}
const sources = new Set(retained.flatMap((surface) => surface.sources));
const surfaces = [...retained];
function addCapture({
  route,
  source,
  state,
  viewport,
  screenshot,
  report,
  reason,
}) {
  sources.add(source);
  surfaces.push({
    id: `runtime-rendered-${surfaces.length + 1}`,
    route,
    state,
    theme: "light",
    status: "rendered",
    reason,
    sources: [source],
    viewport,
    evidence: [addEvidence(screenshot, "screenshot"), report],
  });
}
function publicSource(route) {
  if (route === "/") return "pages/index.tsx";
  if (route === "/404") return "pages/404.tsx";
  if (route.startsWith("/solutions/")) return "pages/solutions/[slug].tsx";
  if (route.startsWith("/guides/")) return "pages/guides/[slug].tsx";
  if (route === "/guides") return "pages/guides/index.tsx";
  return `pages${route}.tsx`;
}
for (const capture of read(reportPaths.marketing).captures) {
  if (capture.result !== "passed") continue;
  addCapture({
    route: capture.route,
    source: publicSource(capture.route),
    state: "isolated marketing export, default",
    viewport: capture.viewport,
    screenshot: capture.screenshot.path,
    report: ids.marketing,
    reason:
      "Actual fresh static export rendered at this viewport; heading/main, overflow, console, account-link origin, public-only requests, no PWA registration, and automated accessibility checked. See report for interaction and visual-inspection scope.",
  });
}
for (const capture of read(reportPaths.pwa).screenshots) {
  if (capture.status !== "accepted") continue;
  addCapture({
    ...capture,
    source: "public/offline.html",
    report: ids.pwa,
    reason:
      "Actual browser disconnected from network after real service-worker registration; generic offline page captured and inspected. No private document data cached. This is Chromium evidence, not physical-device installation.",
  });
}
const protectedReport = "artifacts/runtime/authenticated/report.json";
if (fs.existsSync(path.join(root, protectedReport))) {
  const id = addEvidence(protectedReport);
  for (const capture of read(protectedReport).captures ?? []) {
    if (capture.status !== "accepted") continue;
    addCapture({
      ...capture,
      report: id,
      reason:
        "Actual local protected screen with real NextAuth session and owned synthetic fixture, individually inspected. Browser coverage is limited to these recorded routes/states; API integration evidence is separate.",
    });
  }
}
for (const route of [...inventory.routes, ...inventory.added_routes]) {
  if (sources.has(route.source)) continue;
  surfaces.push({
    id: `source-${route.id}`,
    route: route.route,
    state: "source inventory; browser/data state verification pending",
    theme: "not_applicable",
    status: "source_only",
    reason:
      "Current route and available UI sources indexed; direct local imports resolve. This screen and its data/state combinations were not all rendered. Successful whole-app compilation and selected API flows do not establish a visual pass.",
    sources: [route.source],
    evidence: [ids.inventory, ids.verification, ids.runtime],
  });
}
surfaces.push({
  id: "native-mobile",
  route: "native iOS/Android applications",
  state: "installable mobile web selected",
  theme: "not_applicable",
  status: "not_applicable",
  reason:
    "User selected installable mobile web first. No native app is required or claimed in this repository; physical-device installation remains a web acceptance check.",
  sources: ["docs/roomline/MOBILE_WEB.md"],
  evidence: [ids.pwa, ids.inventory],
});
manifest.surfaces = surfaces;
for (const check of manifest.checks) {
  if (check.id === "runtime")
    Object.assign(check, {
      status: "passed",
      reason:
        "Fresh whole-repository strict TypeScript and full production build pass with no bypass. Real local authentication, tenant/access, upload, redaction and revocation flows are evidenced. Hosted deployment, all optional providers and every protected screen/state remain outside this pass.",
      evidence: [ids.verification, ids.core, ids.extended, ids.runtime],
    });
  if (check.id === "native_mobile")
    Object.assign(check, {
      status: "not_applicable",
      reason:
        "User chose installable mobile web first; no native app claim. Real Chromium installability/offline evidence and device acceptance limits are documented.",
      evidence: [ids.pwa],
    });
  if (check.id === "responsive" || check.id === "accessibility") {
    if (!check.evidence.includes(ids.marketing))
      check.evidence.push(ids.marketing, ids.pwa);
    if (!check.reason.includes("Fresh isolated"))
      check.reason +=
        " Fresh isolated marketing route/viewport checks and generic offline screenshots are recorded separately; no whole-product or physical-device certification.";
  }
}
manifest.limitations = [
  "95 filesystem route templates are inventoried; only recorded browser route/state/viewport pairs are visually verified. Source review and API tests are distinct.",
  "The historical 201-diagnostic report is preserved. Current whole-project compiler/build results are in final-verification.json; no type/build suppression was introduced.",
  "Live local tests use real isolated PostgreSQL, Redis, S3, SMTP and synthetic fixtures. Hosted deployment and owned payment/email/provider configuration remain unverified.",
  "Native apps are outside the selected installable-web scope. Headless Chromium installability/offline results do not verify an OS installation prompt, iOS Safari, physical keyboards or every assistive technology.",
  "Competitor public references and catalog screens do not establish a full authenticated competitor audit or measured design/task superiority.",
  "21st authenticated component search awaits rotated credentials; UXCritique, Intuitive Software Design, 12ui generation and imperial CV context were unavailable. Every named reference has an explicit decision.",
  "Deployment approval was rejected; new Vercel/Railway project records and reviewed pending infrastructure are not a live staging service. Inherited AGPL/enterprise licenses remain unchanged.",
  "Normal CI checks evidence integrity, not release readiness. Strict release validation remains incomplete for source-only surfaces and unconfigured services.",
];
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
const files = [
  ...new Set([
    ...git(["diff", "--name-only", "-z", "origin/main", "--"]),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]),
  ]),
]
  .filter(
    (relative) =>
      fs.existsSync(path.join(root, relative)) &&
      (/^(?:app|pages|components|styles|public|lib|context|ee)\//.test(
        relative,
      ) ||
        /^(?:AGENTS\.md|DESIGN\.md|README\.md|DEPLOYMENT\.md|railway-staging-plan\.json|middleware\.ts|next\.config\.mjs|package\.json|tailwind\.config\.js)$/.test(
          relative,
        ) ||
        /^scripts\/(?:design|runtime|deploy)\//.test(relative)),
  )
  .sort();
manifest.reviewedAt = new Date().toISOString();
manifest.scope = {
  summary:
    "Roomline UX revamp, operational source restoration, real isolated owner/guest verification, installable mobile web, and separate marketing/SaaS staging preparation. All95 screen templates indexed; browser-verified pairs and unverified screens explicitly distinguished.",
  baseline:
    "origin/main ed19717; initial design snapshot3f5b144; runtime restoration against the current working source digest",
  files,
  sourceDigest: calculateSourceDigest(root, files),
};
fs.writeFileSync(
  path.join(root, target),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    sourceFiles: files.length,
    surfaces: surfaces.length,
    rendered: surfaces.filter((surface) => surface.status === "rendered")
      .length,
    references: manifest.toolReviews.length,
    evidence: evidence.length,
  }),
);
