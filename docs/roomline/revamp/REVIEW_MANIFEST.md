# Design review evidence contract

The default record is `artifacts/revamp/review-manifest.json`. Its editor schema is [review-manifest.schema.json](../../../scripts/design/review-manifest.schema.json); the executable contract is [check.mjs](../../../scripts/design/check.mjs). The check uses only Node built-ins, local files, and optionally read-only Git diff. It never calls a service, reads environment secrets, installs dependencies, executes downloaded code, or grades aesthetics.

## Required fields

| Field | Contract |
| --- | --- |
| `schemaVersion` | `1` |
| `reviewedAt` | ISO timestamp identifying this review, not a promise that sources never change |
| `scope` | `summary`, `baseline` (revision/context), nonempty repository-relative `files`, and `sourceDigest` |
| `referenceRegistry` | `docs/roomline/revamp/REFERENCE_REGISTRY.json` |
| `toolReviews` | Exactly one `{id,status,reason,evidence}` per registry entry; status is `applied`, `not_applicable`, or `unavailable` |
| `evidence` | Unique `{id,kind,path}` records; kinds: `screenshot`, `report`, `source`, `trace`, `log`; screenshots also declare positive `width` and `height` |
| `surfaces` | Unique `{id,route,state,theme,status,reason,sources,evidence}` records; rendered records add `viewport:{width,height}` |
| `checks` | Unique `{id,status,reason,evidence}` records including the seven IDs below |
| `limitations` | Array of explicit remaining limits; use an empty array only when there are no known relevant limitations |

`theme` is `light`, `dark`, `system`, or `not_applicable`. Surface `status` is `rendered`, `source_only`, `blocked`, or `not_applicable`. Check `status` is `passed`, `blocked`, `not_applicable`, or `failed`. Required check IDs are `responsive`, `keyboard`, `accessibility`, `states`, `reduced_motion`, `runtime`, and `content_truth`. Explain the actual scope: one checked public keyboard path is not a pass for all protected routes.

Applied reference decisions, passed checks, and rendered surfaces need evidence IDs that exist. Every source/evidence path must resolve to a regular local file inside the checkout and an allowed source/evidence directory. Traversal, absolute paths, escaping symlinks, `.git`, `.env*`, and `node_modules` are rejected. Screenshots require matching PNG dimensions, complete IHDR/IDAT/IEND structure, and valid chunk checksums (maximum 128 MiB per image). Rendered route/state/theme groups require both a mobile width at most 430px and a desktop width at least 1024px. A surface's declared viewport width must match its screenshot; full-page capture height may exceed viewport height.

A structurally valid PNG is not semantic proof of a rendered application. Reviewers must actually capture and inspect the image, verify the correct route/state/theme, and describe the observation. The gate can reject a missing/fake-text screenshot and mismatched dimensions; it cannot prove that an image was honestly captured or its design is usable. Do not attach a generated mockup, source report, marketing competitor screenshot, or unrelated page to a Roomline `rendered` claim.

## Scope freshness and Git changes

`sourceDigest` is SHA256 over sorted scoped file paths, a null separator, file bytes, and another null separator for each file. Compute it after the final source edits, not before. The exported helper is the canonical implementation:

```js
import { calculateSourceDigest } from "./scripts/design/check.mjs";
manifest.scope.sourceDigest = calculateSourceDigest(process.cwd(), manifest.scope.files);
```

The scoped files should cover all actual UI changes in the PR, including earlier changes already on the branch. Reuse explicit route/state/theme evidence groups and source inventory for the rest; there is no requirement to fabricate one screenshot per unchanged legacy component. When using `--base-ref`, the gate requires every added/modified web UI source file in the Git comparison to appear in `scope.files`. It compares merge-base-to-HEAD; run the ordinary digest check locally to include uncommitted source edits. Deleted files do not need an existing-file digest, but removal effects still belong in review scope and surface notes.

## Minimal shape (blocked record)

This example shows shape only, not a valid ready-to-run fixture: fill the digest, list every registry decision, and add all seven check IDs.

```json
{
  "schemaVersion": 1,
  "reviewedAt": "2026-11-14T00:00:00Z",
  "scope": {
    "summary": "Roomline source and shared UI review",
    "baseline": "main plus the existing branch changes",
    "files": ["components/ui/button.tsx"],
    "sourceDigest": "<calculate after final source changes>"
  },
  "referenceRegistry": "docs/roomline/revamp/REFERENCE_REGISTRY.json",
  "toolReviews": [
    {"id": "taste", "status": "applied", "reason": "Read and reconciled direction guidance; no Taste script executed.", "evidence": ["reference-review"]}
  ],
  "evidence": [
    {"id": "reference-review", "kind": "report", "path": "docs/roomline/revamp/REFERENCE_REVIEW_B.md"}
  ],
  "surfaces": [
    {"id": "room-default", "route": "/datarooms/[id]", "state": "default", "theme": "light", "status": "blocked", "reason": "Required source/services unavailable; source review is not browser verification.", "sources": ["pages/datarooms/[id]/index.tsx"], "evidence": ["reference-review"]}
  ],
  "checks": [
    {"id": "runtime", "status": "blocked", "reason": "Authenticated runtime dependencies are unavailable.", "evidence": []}
  ],
  "limitations": ["No authenticated flow pass is claimed."]
}
```

## Commands and gate meaning

```sh
node --test scripts/design/check.test.mjs scripts/design/21st-mcp.test.mjs
node scripts/design/check.mjs
node scripts/design/check.mjs --base-ref main
node scripts/design/check.mjs --require-complete
```

Ordinary mode exits zero for a structurally valid record even when some checks/surfaces remain honestly blocked; it prints `INCOMPLETE` messages and counts. It fails on missing registry decisions, unsupported statuses, unknown/missing evidence, unsafe paths, stale source digest, missing changed-source scope, or unsupported rendered claims. Strict release mode additionally rejects blocked/source-only surfaces and blocked/failed checks. Neither mode is a complete release test or a visual-quality score.

The PR workflow runs deterministic tooling tests and normal manifest validation when UI or design-governance paths change. Making a workflow a required branch-protection status is a repository setting, not something a local YAML file can enforce globally. No service credential is needed by this CI job. Existing project build/tests, functional integration tests, human review, and explicit known-blocker handling still apply.
