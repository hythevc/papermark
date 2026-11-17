# Roomline launch requirements and verification

## Current status — 17 November 2026

The web-first Roomline source has passed a strict repository-wide TypeScript checkpoint with **zero diagnostics** and a full Next.js production build with exit code 0. No type/build-error bypass was added. The final integrated typecheck and production build also pass after the runtime and security fixes; see [the current runtime report](../../artifacts/runtime/README.md) for the latest commands, results, and limitations.

Real isolated local PostgreSQL, Redis with its authenticated REST adapter, SMTP capture, and S3-compatible storage have exercised email-code authentication and the actual NextAuth session, tenant/access checks, PDF bytes/rendering, sharing/download decisions, and revocation. The root implementation agent reported a successful nine-check critical replay after fixing session/download authorization. Local SMTP delivery does not establish a verified production sender or internet deliverability. A paid room-plan fixture does not establish a Stripe charge or production entitlement.

The isolated marketing production build also passed: **10 HTML pages, 47 static files**, with no application providers, backend routes, manifest, or worker. Fresh static-browser evidence is in [artifacts/runtime/marketing](../../artifacts/runtime/marketing/REPORT.md): all **20 route/viewport captures and three interaction groups passed**, with zero automated Axe WCAG A/AA violations, overflow, unexpected console/page errors, foreign/private requests, cookies, or worker registration. The initial mobile-guide button contrast issue was fixed and verified against the rebuilt artifact. Older public screenshots remain historical evidence, not a substitute for this artifact's current proof.

Neither hosted application has been published. Dedicated Railway resources/configuration are staged, while the deployment commit was canceled by the approval gate: “Cancelled — the user did not approve this action. No changes were made.” The Vercel marketing deployment is held for the same concrete combined deployment approval. Do not bypass that gate with another deployment path. See [DEPLOYMENT.md](../../DEPLOYMENT.md) for the exact new project/environment, resources, and pending actions.

## Historical baseline

| Date/checkpoint                                | Result                                               | Meaning                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Initial November 2026 repository inspection    | 203 diagnostics, including 127 missing-module errors | Untouched inherited source baseline                                                     |
| 14 November 2026 rebrand/assessment checkpoint | 201 diagnostics                                      | Public design/rebrand evidence existed; runtime modules were still missing              |
| 17 November 2026 strict source checkpoint      | 0 diagnostics, exit 0                                | Runtime families/dependency drift were restored under the existing strict configuration |
| 17 November 2026 full application build        | Exit 0                                               | Production compilation/build succeeded before the final runtime corrections             |
| 17 November 2026 isolated marketing build      | Exit 0, 10 HTML pages/47 files                       | A standalone public artifact exists; publication remains pending                        |

The [historical comparison](../../artifacts/typecheck-comparison.json) and [zero-diagnostic checkpoint](../../artifacts/runtime/typecheck-checkpoint.json) are retained. The earlier missing-module list is no longer the current build result. A green build still does not verify every screen, role, plan, provider, or production control.

## Required configuration

Use the owned app origin consistently in `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL`; set `NEXT_PUBLIC_APP_BASE_HOST` to its authority and `NEXT_PUBLIC_MARKETING_URL` to the actual public marketing origin. Browser-shared branding uses public variables only. Keep session cookies host-only unless an intentional shared-subdomain deployment needs `NEXTAUTH_COOKIE_DOMAIN`. Use HTTPS and purpose-specific secrets. Customer sharing domains retain their separate resolver and session/access checks.

Configure real PostgreSQL, private S3-compatible storage, and authenticated Redis REST endpoints for sessions, request budgets, and locks. The Railway staging plan uses the tested Redis HTTP adapter backed by persistent real Redis. It does not replace authentication or rate-limit decisions with stubs. Native Railway storage CORS and actual hosted private/signed access remain deployment-time checks.

The staged app uses `ROOMLINE_PROCESSING_MODE=inline` for the bounded PDF path without a Trigger.dev worker. This does not enable local email capture or remove access checks. Office/Keynote still need real operator-owned conversion endpoints; video/background notifications and other worker workflows need their own verified runtime. See [CONVERSIONS.md](CONVERSIONS.md) and [REQUEST_LISTS.md](REQUEST_LISTS.md) for feature boundaries.

Configure this business's **`RESEND_API_KEY` and a verified `EMAIL_FROM`**. These owner bindings are not supplied and must not be copied from another company's project. Optional category/reply-to, postal-address, and unsubscribe settings are documented in `.env.example`. Railway Hobby SMTP restrictions do not block the existing HTTPS Resend integration. Production email registration/login cannot complete without an actual sender binding.

Provide owned support/legal policy URLs and review the working name's domain/trademark availability. Configure and test owned Stripe products, EUR prices/account mappings, portal, webhook signing, checkout, cancellation, and idempotency independently. The inherited catalog has not been prevalidated against a live owned account. Configure identity providers, analytics/Tinybird, Slack, AI, and marketing mail only when the corresponding owned services are available.

The restored `/api/teams/[teamId]/billing/plan` read endpoint returns the actual stored workspace entitlement and an explicit provider state (`unconfigured`, `not_linked`, `verified`, or `unavailable`). Without a configured, linked provider it does not invent a subscription, billing cycle, discount, or payment; unknown fields remain null. Stored customer association is distinct from verified provider status. Active members can read plan gates, while discount details require team-read permission. The hook exposes provider verification and whether a subscription cycle is known. Checkout/management mutation route families such as `billing/manage` and `billing/upgrade` remain absent from this checkout. Paid upgrade, portal, seat, unpause, reactivation and invoice controls now show an explicit unavailable state or stay hidden, and their callers are guarded; no payment success is fabricated. Eligible workspaces retain the existing real free trial entry. This staging scope does not make paid billing operational; implementing and validating owned payment routes and catalog bindings remains separate work.

The root AGPLv3 license, separate enterprise commercial license, source attribution, and original notices remain unchanged. Deployment preparation does not resolve the applicable license/entitlement and source-availability requirements.

## Evidence scope and remaining release work

The [local runtime guide](LOCAL_RUNTIME.md) describes the real disposable service harness. Public artifacts are sanitized; authentication state, OTPs, object keys, raw fixture-state files, service credentials, and captured messages stay outside the checkout; screenshots use synthetic test names/identifiers. The current runtime report distinguishes real protocol/API checks from unit doubles, visual-only checks, unavailable providers, and pending reruns.

Before hosted-use claims, apply only the approved new staging deployment and repeat the relevant register/code/session, room/upload/render/share, allowed/denied guest, cross-tenant/scoped-member, expiration/revocation, download, and storage checks against that environment. Verify backups/restore, service errors, migration behavior, retention/deletion, worker/provider failures, and the actual configured billing lifecycle separately. Previously issued signed URLs remain capabilities until expiry; already downloaded copies cannot be withdrawn.

Browser/PWA evidence is tracked separately from static marketing and API results. Browser installation support is web functionality, not a native iOS/Android app. There is no supplied native project, binary, signing setup, or native-device test in this web-first scope.

The source inventory and visual assessment do not establish whole-application or whole-screen coverage, complete WCAG conformance, production security certification, or superiority to Papermark or another competitor. Each release claim must be tied to its actual current route/state/provider evidence.
