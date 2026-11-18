import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  REQUIRED_CHECKS,
  REQUIRED_REFERENCES,
  calculateSourceDigest,
  safeFile,
  validateReview,
} from "./check.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "roomline-design-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "pages"));
  fs.writeFileSync(
    path.join(root, "pages/index.tsx"),
    "export default function Home() { return null; }\n",
  );
  fs.mkdirSync(path.join(root, "docs/roomline/revamp"), { recursive: true });
  fs.mkdirSync(path.join(root, "artifacts/revamp"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "docs/review.md"),
    "Source was reviewed; runtime is blocked.\n",
  );
  const registry = {
    schemaVersion: 1,
    entries: REQUIRED_REFERENCES.map((id) => ({
      id,
      name: id,
      source: "https://example.com/reference",
      status: "reviewed",
      notes: "Fixture reference",
      evidencePaths: ["docs/review.md"],
    })),
  };
  fs.writeFileSync(
    path.join(root, "docs/roomline/revamp/REFERENCE_REGISTRY.json"),
    JSON.stringify(registry),
  );
  const files = ["pages/index.tsx"];
  const manifest = {
    schemaVersion: 1,
    reviewedAt: "2026-11-14T00:00:00Z",
    scope: {
      summary: "Fixture",
      baseline: "fixture",
      files,
      sourceDigest: calculateSourceDigest(root, files),
    },
    referenceRegistry: "docs/roomline/revamp/REFERENCE_REGISTRY.json",
    toolReviews: REQUIRED_REFERENCES.map((id) => ({
      id,
      status: "not_applicable",
      reason: "Not needed in fixture.",
      evidence: [],
    })),
    evidence: [{ id: "review", kind: "report", path: "docs/review.md" }],
    surfaces: [
      {
        id: "home",
        route: "/",
        state: "default",
        theme: "light",
        status: "blocked",
        reason: "Database unavailable.",
        sources: files,
        evidence: ["review"],
      },
    ],
    checks: REQUIRED_CHECKS.map((id) => ({
      id,
      status: "blocked",
      reason: "Runtime is unavailable.",
      evidence: ["review"],
    })),
    limitations: ["No runtime claim."],
  };
  return { root, manifest, registry };
}

test("honest blocked record validates but strict release mode rejects it", (t) => {
  const { root, manifest, registry } = fixture(t);
  const result = validateReview(root, manifest, registry);
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.unverified, 1);
  assert(result.warnings.some((x) => x.includes("home")));
  assert(
    validateReview(root, manifest, registry, {
      requireComplete: true,
    }).errors.some((x) => x.includes("Release review incomplete")),
  );
});

test("stale source digest and unscoped UI changes fail", (t) => {
  const { root, manifest, registry } = fixture(t);
  fs.appendFileSync(path.join(root, "pages/index.tsx"), "// changed\n");
  const errors = validateReview(root, manifest, registry, {
    changedFiles: ["components/new.tsx", "lib/api.ts"],
  }).errors;
  assert(errors.some((x) => x.includes("sourceDigest")));
  assert(errors.some((x) => x.includes("components/new.tsx")));
  assert(!errors.some((x) => x.includes("lib/api.ts")));
});

test("sensitive, traversal, and outside-symlink paths are rejected", (t) => {
  const { root, manifest, registry } = fixture(t);
  for (const file of [
    "../escape",
    "/etc/passwd",
    ".env",
    "docs/../.env",
    "docs\\review.md",
    ".git/config",
    "node_modules/test.js",
  ]) {
    assert.throws(() => safeFile(root, file));
  }
  fs.symlinkSync("/etc/passwd", path.join(root, "docs/outside"));
  assert.throws(() => safeFile(root, "docs/outside"));
  manifest.evidence[0].path = ".env";
  assert(
    validateReview(root, manifest, registry).errors.some((x) =>
      x.includes("Evidence review"),
    ),
  );
});

test("rendered claim without screenshot and missing tool decisions fail", (t) => {
  const { root, manifest, registry } = fixture(t);
  manifest.surfaces[0].status = "rendered";
  manifest.surfaces[0].viewport = { width: 390, height: 844 };
  manifest.toolReviews.pop();
  const errors = validateReview(root, manifest, registry).errors;
  assert(errors.some((x) => x.includes("matching screenshot")));
  assert(errors.some((x) => x.includes("Missing applied")));
  assert(errors.some((x) => x.includes("both mobile")));
});

test("fake screenshot, duplicate IDs and unknown evidence references fail", (t) => {
  const { root, manifest, registry } = fixture(t);
  fs.writeFileSync(
    path.join(root, "artifacts/revamp/fake.png"),
    "not an image",
  );
  manifest.evidence.push(
    {
      id: "fake",
      kind: "screenshot",
      path: "artifacts/revamp/fake.png",
      width: 390,
      height: 844,
    },
    { ...manifest.evidence[0] },
  );
  manifest.checks[0].status = "passed";
  manifest.checks[0].evidence = ["missing"];
  const errors = validateReview(root, manifest, registry).errors;
  assert(errors.some((x) => x.includes("PNG")));
  assert(errors.some((x) => x.includes("Evidence IDs")));
  assert(errors.some((x) => x.includes("unknown evidence ID missing")));
});

test("applied reference and passed check need evidence; malformed rows do not crash", (t) => {
  const { root, manifest, registry } = fixture(t);
  manifest.toolReviews[0].status = "applied";
  manifest.checks[0].status = "passed";
  manifest.checks[0].evidence = [];
  assert(
    validateReview(root, manifest, registry).errors.filter((x) =>
      x.includes("evidence is required"),
    ).length >= 2,
  );
  manifest.surfaces.push(null);
  manifest.evidence.push(null);
  manifest.toolReviews.push(null);
  manifest.checks.push(null);
  registry.entries.push(null);
  assert.doesNotThrow(() => validateReview(root, manifest, registry));
  assert(
    validateReview(root, manifest, registry).errors.some((x) =>
      x.includes("must be an object"),
    ),
  );
});

test("valid PNGs support paired rendered evidence and mismatched dimensions fail", (t) => {
  const { root, manifest, registry } = fixture(t);
  // Generate valid blank fixture images; these are not product-review artifacts.
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++)
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const output = Buffer.alloc(12 + data.length);
    output.writeUInt32BE(data.length);
    output.write(type, 4);
    data.copy(output, 8);
    output.writeUInt32BE(
      crc32(output.subarray(4, 8 + data.length)),
      8 + data.length,
    );
    return output;
  };
  for (const [name, width, height] of [
    ["phone", 390, 844],
    ["desktop", 1440, 1000],
  ]) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(Buffer.alloc((width * 4 + 1) * height))),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    fs.writeFileSync(path.join(root, `artifacts/revamp/${name}.png`), png);
    manifest.evidence.push({
      id: name,
      kind: "screenshot",
      path: `artifacts/revamp/${name}.png`,
      width,
      height,
    });
    manifest.surfaces.push({
      ...manifest.surfaces[0],
      id: name,
      status: "rendered",
      reason: "Synthetic metadata fixture, not a product pass.",
      evidence: [name],
      viewport: { width, height },
    });
  }
  const result = validateReview(root, manifest, registry);
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.rendered, 2);
  assert.equal(result.counts.unverified, 1);
  manifest.evidence.at(-1).width = 1439;
  assert(
    validateReview(root, manifest, registry).errors.some((x) =>
      x.includes("dimensions"),
    ),
  );
});
