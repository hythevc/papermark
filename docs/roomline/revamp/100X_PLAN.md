# Roomline “100X” improvement plan

"100X" is the name of a prioritized roadmap. It is not a measured performance, usability, conversion, deal-speed, or competitive-superiority claim. The current evidence is [the source inventory](SCREEN_CHECK_MATRIX.md), [competitor assessment](COMPETITIVE_ASSESSMENT.md), [reference reviews](REFERENCE_REGISTRY.md), and the [review manifest](../../../artifacts/revamp/review-manifest.json). Rendered public screens and source-only protected routes must remain distinct.

## P0 — Restore the complete runnable product and business foundations

| Work | Completion evidence | Dependency / owner decision |
| --- | --- | --- |
| Restore missing enterprise modules from an authorized source or deliberately remove unavailable product exposure with proper contract review | Build/typecheck succeeds; inventory has no unexplained missing imports; intended feature behavior tested | Repository owner supplies licensed source or selects an authorized product scope. Do not fabricate placeholder enterprise implementations. |
| Configure development/staging database, auth/email, file storage/processing, analytics, and other used services | Real signup/session, upload/processing/retry, share/guest access, revoke, event and cleanup checks | Environment readiness and genuine service credentials; secret values stay outside source/chat artifacts. |
| Confirm upstream AGPL and `ee/` licensing boundaries for the commercial fork | Documented permitted distribution/hosting/source obligations and enterprise rights | Repository license and commercial owner decision; UI rebranding does not remove upstream notices or grant enterprise rights. |
| Verify tenant/role/plan enforcement, retention/account lifecycle, operational recovery, and billing entitlements | Appropriate integration tests and staging scenarios; truthful launch checklist | Working backend and business configuration. Mocked screens do not prove these. |

Do not describe a launch as complete while these dependencies are unresolved. A documented blocker is an accurate review result, not a visual failure to conceal.

## P1 — Shared foundations and reachable public/mobile experience now

1. Apply the locked forest/paper/charcoal identity through semantic tokens, core controls, forms, dialogs/sheets, menus, tables, badges, navigation and viewer chrome while preserving customer branding.
2. Improve public positioning and product demonstration, CTA paths, authentication presentation, verification/error messaging, and truthful setup information. Use illustrative sample UI only with explicit labeling.
3. Improve mobile layout structure, safe areas, target sizes, focus, reduced motion, long-name handling, and control consistency. Validate reachable routes at desktop/390px in supported themes.
4. Persist AGENTS/DESIGN/reference policy, the route/state inventory, scoped-source freshness digest, screenshot/DOM/log evidence and the deterministic CI record gate.

Acceptance: actually inspected public/mobile screenshots; working public navigation; honest unconfigured-service errors; no claimed live private-room state without real data. Source-reviewed shared changes are documented separately from rendered protected-route checks.

## P2 — Complete authenticated jobs and state coverage after restoration

| Priority job | Experience objective | Evidence to collect |
| --- | --- | --- |
| Create room → organize/upload → readiness review → share → guest access | Clear path from empty room to correctly configured first share, with recoverable failed upload/processing | Matched task completion, first-attempt correctness, time, preserved work and effective permission tests |
| Share/access management | Audience and effective scope understandable; distinguish membership, link access and exported copy; clear expiry/revoke outcomes | Owner and guest role/plan scenarios, preview consistency, real denied/expired/revoked states |
| Requests / Q&A | Missing document, owner, pending answer and next step visible from the room | Empty/loading/error/pending/read-only/confirmation scenarios and accessible update feedback |
| Files / versions / downloads / redaction | Stable naming/version context and trustworthy progress/recovery | Actual file types, large/failed/duplicate upload, denied download, version update and licensed redaction tests |
| Activity / analytics | Evidence answers a concrete question and does not invent investment intent | Event accuracy, period/version context, anonymous/internal/bot limits and accessible chart/table checks |
| Settings / roles / billing / support | Clear plan/role differences, reversible decisions, predictable entitlement changes | Real upgrade/downgrade/cancel/failure paths, audit events and support links |

Every applicable default, loading, processing, empty, filtered-empty, failed, selected, disabled, read-only, pending, access-denied, success, and confirmation state needs review. Use the 88-screen baseline plus 6 added route templates (94 total) as a planning map; do not call that count a completed browser audit. Group shared contracts sensibly and include route/state/theme evidence where actually rendered.

## P3 — Native applications only when supplied

No iOS/Android/React Native/Rune project is established by this web repository. If a native repository is provided, inventory its actual framework, navigation, accessibility APIs, device support, signing and tests; then apply the relevant native skills and verify on its runtime. Emil's Apple-design web principles do not themselves create an iOS app. Do not force a SwiftUI/Rust/React Native migration into this SaaS redesign.

## How improvement will be measured

First establish a baseline on the same tasks with the same representative data and roles. Then compare task success, first-attempt permission correctness, recovery success, time to first correctly shared room, time to resolve an outstanding request, and user understanding of engagement evidence. Record participant/task counts and test limits. Performance claims need actual measured upload/viewer/page data; accessibility claims need the stated testing scope. No invented scores, multipliers, customer endorsements, or “better than every data room” assertions.
