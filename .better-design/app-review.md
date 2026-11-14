# Roomline design and UX assessment

**94 route templates reviewed in source; 13 public/reference paths rendered at desktop and phone widths. Findings: 1 critical, 4 serious, 4 moderate; no numeric design score is assigned to unmeasured screens.** This is a development assessment with explicit coverage gaps, not proof of market superiority or a completed production launch.

Assessment date: 2026-11-14. The starting point was Roomline commit `5a26e46`, not the untouched upstream Papermark application. [All screen/source checks](../docs/roomline/revamp/SCREEN_CHECK_MATRIX.md), [machine inventory](../docs/roomline/revamp/SCREEN_INVENTORY.json), and [reference registry](../docs/roomline/revamp/REFERENCE_REGISTRY.md) define scope. The inventory preserves 88 baseline templates and appends 6 new templates; four static solution/guide URLs share two dynamic templates.

## Outcome and remaining limit

The public site now has substantive Product, Security, Fundraising, Due diligence, Guides, and two article pages; the homepage uses a readable interactive product preview rather than tiny screenshot-like controls. Shared primitives and mobile shell source have been improved, registration is clearer, and a live component-reference page makes normal/error/loading/empty, modal, sheet, keyboard, and theme behavior inspectable.

The authenticated product still references missing source and has 201 inherited TypeScript diagnostics. The final comparison adds zero diagnostics to the prior release. A browser cannot verify rooms, uploads, sharing enforcement, billing, or customer viewer flows until the compatible source and test services are restored. No security or billing stubs and no build-check bypass were introduced.

## Ranked findings

| ID | Severity and evidence | Finding | Result |
| --- | --- | --- | --- |
| R1 | Critical; Derived from full compiler comparison and missing-import inventory | Core authenticated room flows cannot compile because the checkout references unavailable source, including EE currency, branding, permissions, request-list, and redaction modules. Restore compatible source and dependencies before evaluating protected flows end to end. | Open; production and authenticated visual assessment blocked |
| R2 | Serious; Derived `rule/dialog-manages-focus`, verified in actual primitive browser tests | Shared Dialog previously prevented normal close autofocus and manually cleared body pointer events. Use Radix's focus/overlay lifecycle and verify focus entry/trap/return and nested cleanup. | Fixed; focused Dialog/Sheet checks passed |
| R3 | Serious; Derived `rule/native-element-first` and disabled-state behavior, verified in browser | A disabled/loading `Button asChild` passed a nonfunctional disabled attribute to an anchor, permitting navigation and child handlers. Prevent click/key/aux activation, expose `aria-disabled`, and retain native button behavior. | Fixed; disabled Slot callbacks/navigation remained blocked |
| R4 | Serious; Derived form recovery, verified with mocked APIs | Login's email request had no rejection recovery, leaving controls pending after network failure. Preserve input and restore controls with a useful error. | Fixed; network abort/retry checks passed; real delivery still unverified |
| R5 | Serious; Derived mobile geometry | App content reserved 4rem below a 4.5rem bottom bar, risking hidden content/actions. Share header/nav size tokens including safe-area reserves. | Implemented; source and sizing checks passed; authenticated shell rendering blocked |
| R6 | Moderate; Derived navigation semantics, regression-tested | Room Overview appeared selected as Documents, and substring matching could misclassify routes. Match segments, distinguish overview/document/group/settings context, and announce the current link. | Implemented; 4 navigation regression tests pass; authenticated rendering blocked |
| R7 | Moderate; Inferred from accepted baseline screenshots | The homepage's interactive preview used 7–11px screenshot-like labels and small actions. Recompose as readable controls with mobile 44px targets and explicit illustrative data. | Fixed; public browser/axe/reflow checks passed |
| R8 | Moderate; Derived `rule/form-input-needs-label` and heading hierarchy, verified in renders | Registration lacked a persistent visible email label and consistent account-entry hierarchy; login/code titles were styled spans. Use real headings, a visible label, input constraints, and recoverable states. | Fixed; default/error/code-entry/expired states checked with mocked APIs |
| R9 | Moderate; Inferred architecture gap plus source inventory | A single landing page offered little detail for distinct buyer tasks. Add navigable product, use-case, security, and preparation-guide surfaces using the actual product scope. | Fixed for public content; prices, certifications, and customer proof were not invented |

The source-level implementations above do not establish that every legacy component call site is visually correct. Current primitives retain the custom `Button.loading` and other existing APIs. Theme tokens were checked in 48 declared role pairs, not against every legacy hardcoded style.

## Competitor assessment

[Source-backed competitor report](../docs/roomline/revamp/COMPETITIVE_ASSESSMENT.md) covers Papermark, DocSend, Firmex, and Ideals. Six live public pages were captured at desktop and 390px. Catalog references are labeled separately; authenticated competitor access and native app behavior were not established.

Papermark already advertises rich sharing, analytics, permissions, request lists, Q&A, AI, and branding. DocSend offers dedicated data-room and plan-comparison narratives; enterprise VDRs explain diligence and service requirements. Generic AI/analytics/security feature lists are not sufficient differentiation.

Roomline's proposed wedge is a coherent preparation→review access→share→follow-up workflow. Validate it with time to first correctly configured share, permission-setting comprehension, upload recovery, and time to identify a real next action. “100X” is the roadmap name, not a measured improvement claim.

## Accepted walkthrough evidence

| Step | Surface | Health and limits |
| --- | --- | --- |
| 1 | Homepage and sample preview | Rendered at 1440/390px; search, empty recovery, section navigation and FAQ keyboard behavior passed. All metrics/events are labeled sample data. |
| 2 | Product→solution→guide→security paths | Seven new public paths rendered, one page heading/main, readable content and responsive reflow. Security copy describes conditional controls, not a certification. |
| 3 | Create account | Default/error/retry states rendered; work-email label, normalized email and callback preservation checked with mocked NextAuth responses. |
| 4 | Code entry and expired recovery | Short code cannot submit; mocked invalid complete code reaches recovery. No actual login credential or email exchange was verified. |
| 5 | Component reference | Real installed primitives rendered in light/dark and phone/desktop; disabled/loading links, keyboard selection, Dialog/Sheet focus, 44px touch sizing and reduced motion checked. |
| 6 | Protected room/documents/access/billing | Source reviewed; live visual/task verification blocked by missing source, credentials, records and service configuration. No visual pass assigned. |
| 7 | Native iOS/Android | No native project found or supplied; no native screen assessment or implementation claimed. Responsive web testing is not native testing. |

Accepted before/after screenshots and machine reports are in [artifacts/revamp](../artifacts/revamp). The desktop browser's phone-sized viewport does not establish behavior with a real device keyboard, OS share sheet, biometrics, or native navigation.

## Tool and reference coverage

All 34 requested/reference entries have an explicit decision in the registry and review manifest. Refero, Mobbin, Better Design, Product Design, Awesome DESIGN.md and shadcn reference workflows informed the work; UX Pilot supplied a read-only flow draft. Reference-only frameworks were not installed as runtime dependencies. The team-reviewed DESIGN.md and AGENTS.md apply to this repository, not inaccessible projects or every human's editor.

21st.dev CLI 1.18.0 is installed and a secret-free MCP configuration plus verification script is supplied. Authenticated tool listing/search is blocked until a rotated `API_KEY_21ST` is configured or browser login completes. The exposed key was neither reused nor saved. `imperial_masters_cv.docx` was not in the workspace; its named Drive search requires reauthentication. No callable UXCritique or Intuitive Software Design integration was found, so no fabricated plugin result is claimed.

## Checks not run, by screen family

Every non-rendered route is listed in the 94-row matrix with its source state markers and blocking context. For those rows, rendered spacing, contrast, keyboard/focus, responsive behavior, dynamic copy comprehension, and task completion remain **not measured**. The same applies to their private dialogs, upload/processing/error states, permissions, long documents, and tenant-specific branding. Source markers are candidates, not proof that a state exists or passes.

Better Design's source rules/feature map and a homepage text comprehension heuristic were used; that heuristic is not a real-user study. Its initially verbose hero was shortened. Other dynamic screen copy was not submitted as if it were live rendered content. Screenshots and automated axe checks do not establish complete WCAG conformance, security, legal entitlement, or product-market advantage.

## Release decision

Keep the PR a draft. The normal design check validates evidence integrity, reference decisions and source freshness, while preserving known blockers. `npm run design:check:release` must fail while protected screens remain unverified. The [prioritized plan](../docs/roomline/revamp/100X_PLAN.md) begins with runtime/source/license/service restoration, then protected-flow verification, and only then a separately scoped native app when its repository exists.
