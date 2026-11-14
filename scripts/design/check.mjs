#!/usr/bin/env node
/** Validates review records and local evidence; never grades visual quality. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REQUIRED_CHECKS = [
  "responsive",
  "keyboard",
  "accessibility",
  "states",
  "reduced_motion",
  "runtime",
  "content_truth",
];
export const REQUIRED_REFERENCES = [
  "taste",
  "web-guidelines",
  "image-to-code",
  "awesome-design-md",
  "playwright",
  "refero",
  "mobbin",
  "better-design",
  "uxpilot",
  "shadcn",
  "21st",
  "uxcritique",
  "intuitive-software-design",
  "design-system",
  "imperial-cv",
];
const ROOT_FILES = new Set([
  "AGENTS.md",
  "DESIGN.md",
  "README.md",
  "components.json",
  "tailwind.config.js",
  "next.config.mjs",
  "package.json",
  "skills-lock.json",
  "middleware.ts",
]);
const DIRECTORIES = new Set([
  "artifacts",
  "docs",
  "pages",
  "app",
  "components",
  "public",
  "styles",
  "lib",
  "context",
  "ee",
  ".agents",
  ".better-design",
  ".github",
]);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const list = (value) => (Array.isArray(value) ? value : []);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = (value) =>
  text(value) &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));

export function safeFile(root, relative) {
  if (
    !text(relative) ||
    relative.includes("\\") ||
    relative.includes("\0") ||
    path.isAbsolute(relative)
  )
    throw new Error("Expected a repository-relative file path.");
  const parts = relative.split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part === ".git" ||
        part === "node_modules" ||
        part.startsWith(".env"),
    )
  )
    throw new Error("Unsafe or sensitive evidence path.");
  if (
    !(
      ROOT_FILES.has(relative) ||
      DIRECTORIES.has(parts[0]) ||
      relative.startsWith("scripts/design/")
    )
  )
    throw new Error(
      "Path is outside the allowed source and evidence directories.",
    );
  const resolvedRoot = fs.realpathSync(root);
  const resolved = fs.realpathSync(path.join(resolvedRoot, relative));
  if (
    !resolved.startsWith(resolvedRoot + path.sep) ||
    !fs.statSync(resolved).isFile()
  )
    throw new Error("Evidence must be a regular file within this checkout.");
  return resolved;
}

export function calculateSourceDigest(root, files) {
  const hash = createHash("sha256");
  for (const relative of [...files].sort()) {
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(safeFile(root, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function isUiFile(file) {
  return (
    /^(?:components|styles|public)\//.test(file) ||
    /^(?:app|pages|ee|lib|context)\/.*\.(?:tsx|jsx|css|scss)$/.test(file) ||
    [
      "tailwind.config.js",
      "components.json",
      "middleware.ts",
      "lib/brand.ts",
    ].includes(file) ||
    /^lib\/(?:marketing-|navigation\/)/.test(file)
  );
}

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngSize(file) {
  if (fs.statSync(file).size > 128 * 1024 * 1024)
    throw new Error("PNG exceeds review size limit.");
  const bytes = fs.readFileSync(file);
  if (
    bytes.length < 45 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Invalid PNG signature.");
  let offset = 8,
    size,
    hasData = false,
    ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset),
      type = bytes.toString("ascii", offset + 4, offset + 8),
      end = offset + 8 + length;
    if (
      end + 4 > bytes.length ||
      crc32(bytes.subarray(offset + 4, end)) !== bytes.readUInt32BE(end)
    )
      throw new Error("Invalid PNG chunk/checksum.");
    if (offset === 8) {
      if (type !== "IHDR" || length !== 13)
        throw new Error("PNG must start with IHDR.");
      size = {
        width: bytes.readUInt32BE(offset + 8),
        height: bytes.readUInt32BE(offset + 12),
      };
    }
    if (type === "IDAT" && length > 0) hasData = true;
    offset = end + 4;
    if (type === "IEND") {
      ended = length === 0 && offset === bytes.length;
      break;
    }
  }
  if (!hasData || !ended || !size) throw new Error("PNG is incomplete.");
  return size;
}

export function validateReview(
  root,
  manifest,
  registry,
  { requireComplete = false, changedFiles = [] } = {},
) {
  const errors = [],
    warnings = [];
  const assert = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const localFile = (relative, label) => {
    try {
      return safeFile(root, relative);
    } catch {
      errors.push(`${label}: missing, unsafe, or non-file repository path.`);
      return null;
    }
  };
  assert(object(manifest), "Manifest must be an object.");
  assert(object(registry), "Reference registry must be an object.");
  if (!object(manifest) || !object(registry))
    return { errors, warnings, counts: {} };
  assert(manifest.schemaVersion === 1, "Unsupported manifest schemaVersion.");
  assert(registry.schemaVersion === 1, "Unsupported registry schemaVersion.");
  assert(
    timestamp(manifest.reviewedAt),
    "reviewedAt must be an ISO timestamp.",
  );
  assert(
    text(manifest.scope?.summary) && text(manifest.scope?.baseline),
    "Scope needs a summary and baseline revision/context.",
  );
  const files = list(manifest.scope?.files);
  assert(
    files.length > 0 && files.every(text),
    "Scope must list the reviewed source files.",
  );
  assert(new Set(files).size === files.length, "Duplicate scope file.");
  files.forEach((file) => localFile(file, "Scope"));
  try {
    assert(
      manifest.scope?.sourceDigest === calculateSourceDigest(root, files),
      "Scope sourceDigest does not match current source; refresh the review after source changes.",
    );
  } catch {
    /* Precise path failures are already reported above. */
  }
  for (const file of changedFiles.filter(isUiFile))
    assert(
      files.includes(file),
      `Changed UI source is not in scope.files: ${file}`,
    );
  assert(
    manifest.referenceRegistry ===
      "docs/roomline/revamp/REFERENCE_REGISTRY.json",
    "Use the canonical reference registry path.",
  );
  localFile(manifest.referenceRegistry, "Registry");
  const entries = list(registry.entries),
    refs = new Set();
  assert(entries.length > 0, "Registry must contain named references.");
  for (const entry of entries) {
    if (!object(entry)) {
      errors.push("Registry entry must be an object.");
      continue;
    }
    assert(
      text(entry.id) && !refs.has(entry.id),
      "Registry IDs must be nonempty and unique.",
    );
    refs.add(entry.id);
    assert(
      text(entry.name) &&
        text(entry.source) &&
        text(entry.status) &&
        text(entry.notes),
      `Reference ${entry.id}: name/source/status/notes are required.`,
    );
    for (const evidencePath of list(entry.evidencePaths))
      localFile(evidencePath, `Reference ${entry.id}`);
  }
  for (const id of REQUIRED_REFERENCES)
    assert(refs.has(id), `Required named reference missing: ${id}`);
  const evidence = new Map();
  assert(Array.isArray(manifest.evidence), "evidence must be an array.");
  for (const item of list(manifest.evidence)) {
    if (!object(item)) {
      errors.push("Evidence entry must be an object.");
      continue;
    }
    assert(
      text(item.id) && !evidence.has(item.id),
      "Evidence IDs must be nonempty and unique.",
    );
    assert(
      ["screenshot", "report", "source", "trace", "log"].includes(item.kind),
      `Evidence ${item.id}: invalid kind.`,
    );
    const file = localFile(item.path, `Evidence ${item.id}`);
    if (file && item.kind === "screenshot") {
      try {
        const size = pngSize(file);
        assert(
          size.width > 0 &&
            size.height > 0 &&
            size.width === item.width &&
            size.height === item.height,
          `Evidence ${item.id}: declared screenshot dimensions do not match PNG.`,
        );
      } catch {
        errors.push(
          `Evidence ${item.id}: screenshot must be a real PNG with matching dimensions.`,
        );
      }
    }
    evidence.set(item.id, item);
  }
  const evidenceRefs = (items, label, required = false) => {
    assert(Array.isArray(items), `${label}: evidence must be an array.`);
    if (required)
      assert(
        list(items).length > 0,
        `${label}: evidence is required for an applied/passed/rendered claim.`,
      );
    for (const id of list(items))
      assert(evidence.has(id), `${label}: unknown evidence ID ${id}.`);
  };
  const tools = new Set();
  assert(Array.isArray(manifest.toolReviews), "toolReviews must be an array.");
  for (const tool of list(manifest.toolReviews)) {
    if (!object(tool)) {
      errors.push("Tool review must be an object.");
      continue;
    }
    assert(
      refs.has(tool.id) && !tools.has(tool.id),
      `Tool review ${tool.id}: unknown or duplicate ID.`,
    );
    tools.add(tool.id);
    assert(
      ["applied", "not_applicable", "unavailable"].includes(tool.status) &&
        text(tool.reason),
      `Tool review ${tool.id}: explicit status and reason are required.`,
    );
    evidenceRefs(
      tool.evidence,
      `Tool review ${tool.id}`,
      tool.status === "applied",
    );
    if (tool.status === "unavailable")
      warnings.push(`Unavailable reference/tool: ${tool.id} (${tool.reason})`);
  }
  for (const id of refs)
    assert(
      tools.has(id),
      `Missing applied/not_applicable/unavailable decision: ${id}`,
    );
  const surfaces = list(manifest.surfaces),
    surfaceIds = new Set(),
    pairs = new Map();
  assert(
    surfaces.length > 0,
    "At least one explicit route/state/theme surface is required.",
  );
  for (const surface of surfaces) {
    if (!object(surface)) {
      errors.push("Surface must be an object.");
      continue;
    }
    assert(
      text(surface.id) && !surfaceIds.has(surface.id),
      "Surface IDs must be nonempty and unique.",
    );
    surfaceIds.add(surface.id);
    assert(
      text(surface.route) && text(surface.state) && text(surface.reason),
      `Surface ${surface.id}: route/state/reason are required.`,
    );
    assert(
      ["light", "dark", "system", "not_applicable"].includes(surface.theme),
      `Surface ${surface.id}: invalid theme.`,
    );
    assert(
      ["rendered", "source_only", "blocked", "not_applicable"].includes(
        surface.status,
      ),
      `Surface ${surface.id}: invalid status.`,
    );
    assert(
      list(surface.sources).length > 0,
      `Surface ${surface.id}: source paths are required.`,
    );
    for (const source of list(surface.sources))
      localFile(source, `Surface ${surface.id}`);
    evidenceRefs(
      surface.evidence,
      `Surface ${surface.id}`,
      surface.status === "rendered",
    );
    if (surface.status === "rendered") {
      assert(
        Number.isInteger(surface.viewport?.width) &&
          surface.viewport.width > 0 &&
          Number.isInteger(surface.viewport?.height) &&
          surface.viewport.height > 0,
        `Surface ${surface.id}: positive viewport dimensions are required.`,
      );
      const shots = list(surface.evidence)
        .map((id) => evidence.get(id))
        .filter((item) => item?.kind === "screenshot");
      assert(
        shots.some(
          (shot) =>
            shot.width === surface.viewport?.width &&
            shot.height >= surface.viewport?.height,
        ),
        `Surface ${surface.id}: matching screenshot evidence is required.`,
      );
      const key = [surface.route, surface.state, surface.theme].join("\0");
      const widths = pairs.get(key) ?? [];
      widths.push(surface.viewport?.width);
      pairs.set(key, widths);
    } else if (surface.status !== "not_applicable") {
      warnings.push(
        `Unverified surface: ${surface.id} (${surface.status}: ${surface.reason})`,
      );
      if (requireComplete)
        errors.push(
          `Release review incomplete: ${surface.id} is ${surface.status}.`,
        );
    }
  }
  for (const [key, widths] of pairs)
    assert(
      widths.some((width) => width <= 430) &&
        widths.some((width) => width >= 1024),
      `Rendered route/state/theme needs both mobile (<=430) and desktop (>=1024) evidence: ${key.replaceAll("\0", " / ")}`,
    );
  const checks = new Set();
  assert(Array.isArray(manifest.checks), "checks must be an array.");
  for (const check of list(manifest.checks)) {
    if (!object(check)) {
      errors.push("Check must be an object.");
      continue;
    }
    assert(
      text(check.id) && !checks.has(check.id),
      "Check IDs must be nonempty and unique.",
    );
    checks.add(check.id);
    assert(
      ["passed", "blocked", "not_applicable", "failed"].includes(
        check.status,
      ) && text(check.reason),
      `Check ${check.id}: explicit status and reason are required.`,
    );
    evidenceRefs(
      check.evidence,
      `Check ${check.id}`,
      check.status === "passed",
    );
    if (["blocked", "failed"].includes(check.status)) {
      warnings.push(
        `Incomplete check: ${check.id} (${check.status}: ${check.reason})`,
      );
      if (requireComplete)
        errors.push(
          `Release check incomplete: ${check.id} is ${check.status}.`,
        );
    }
  }
  for (const id of REQUIRED_CHECKS)
    assert(checks.has(id), `Required review check missing: ${id}`);
  assert(
    Array.isArray(manifest.limitations) && manifest.limitations.every(text),
    "limitations must be an array of nonempty strings.",
  );
  return {
    errors,
    warnings,
    counts: {
      surfaces: surfaces.length,
      rendered: surfaces.filter((surface) => surface?.status === "rendered")
        .length,
      unverified: surfaces.filter((surface) =>
        ["source_only", "blocked"].includes(surface?.status),
      ).length,
      references: refs.size,
      evidence: evidence.size,
    },
  };
}

export function main(
  argv = process.argv.slice(2),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
) {
  let manifestPath = "artifacts/revamp/review-manifest.json",
    baseRef,
    requireComplete = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help")
      return {
        code: 0,
        output:
          "Usage: node scripts/design/check.mjs [--manifest <repo-path>] [--base-ref <git-ref>] [--require-complete]\nValidates evidence records only; blocked/source-only work is explicitly reported. --require-complete rejects incomplete release checks.",
      };
    if (argv[i] === "--manifest" && argv[i + 1]) manifestPath = argv[++i];
    else if (argv[i] === "--base-ref" && argv[i + 1]) baseRef = argv[++i];
    else if (argv[i] === "--require-complete") requireComplete = true;
    else throw new Error("Unknown or incomplete option; use --help.");
  }
  const readJson = (relative) => {
    const file = safeFile(root, relative);
    if (fs.statSync(file).size > 8 * 1024 * 1024)
      throw new Error("Review JSON exceeds 8 MiB.");
    return JSON.parse(fs.readFileSync(file, "utf8"));
  };
  const manifest = readJson(manifestPath);
  const registry = readJson("docs/roomline/revamp/REFERENCE_REGISTRY.json");
  let changedFiles = [];
  if (baseRef) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._/~-]*$/.test(baseRef) ||
      baseRef.includes("..")
    )
      throw new Error("Invalid base ref.");
    changedFiles = execFileSync(
      "git",
      [
        "diff",
        "--name-only",
        "-z",
        "--diff-filter=ACMRT",
        `${baseRef}...HEAD`,
        "--",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    )
      .split("\0")
      .filter(Boolean);
  }
  const result = validateReview(root, manifest, registry, {
    requireComplete,
    changedFiles,
  });
  const lines = [
    ...result.errors.map((error) => `ERROR: ${error}`),
    ...result.warnings.map((warning) => `INCOMPLETE: ${warning}`),
  ];
  lines.push(
    result.errors.length
      ? `INVALID REVIEW RECORD (${result.errors.length} errors).`
      : `VALID REVIEW RECORD: ${result.counts.rendered} rendered surfaces, ${result.counts.unverified} unverified surfaces, ${result.counts.references} named reference decisions.`,
  );
  lines.push(
    "This checks record structure, source freshness, and local evidence—not visual quality, security, or shipping readiness.",
  );
  return {
    code: result.errors.length ? 1 : 0,
    output: lines.join("\n"),
    result,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = main();
    console.log(result.output);
    process.exitCode = result.code;
  } catch {
    console.error(
      "Design review validation could not read safe local inputs. Check manifest/registry paths, JSON, and git base ref; no input contents were logged.",
    );
    process.exitCode = 1;
  }
}
