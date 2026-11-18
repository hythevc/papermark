# Roomline runtime restoration · 17 November 2026

This report records local verification of the Roomline branch. Marketing was subsequently [published and hosted-verified on Vercel](../deployment/vercel.md) at https://roomline-marketing-hythevc.vercel.app on 18 November 2026. The full SaaS application remains offline on Railway: its reviewed 109 changes are staged, but automatic approval review rejected applying them even after the user's explicit approval. [Current Railway status](../deployment/railway.json).

## What changed

The checkout's 201 strict TypeScript diagnostics were reproduced, then resolved through independently implemented modules and compatible dependencies. Public upstream history did not contain the omitted modules; no build/type suppression or security/billing placeholders were added. The Prisma schema and inherited licenses are unchanged.

Restored areas include scoped branding, permission defaults, request lists and resumable uploads, billing/currency contracts, conversations, reading-mask controls, configured conversion adapters, trial notifications, real analytics fallback, and manual PDF redaction. Optional providers initialize only when used/configured. Trial onboarding accepts both existing forms and prevents concurrent duplicate trials. A real revoked-link test exposed and repaired fresh page-URL issuance after revocation.

The selected mobile deliverable is installable mobile web. The application has its own manifest, icons, service worker, install guidance, and generic offline page. The independent marketing export has no app providers, private routes, manifest, or service worker.

## Evidence

| Check                                | Evidence and scope                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compiler baseline                    | [typecheck-before.log](typecheck-before.log): 201 diagnostics from the starting Roomline branch.                                                                                                                                             |
| Whole-repository compiler checkpoint | [typecheck-checkpoint.json](typecheck-checkpoint.json): strict check, zero diagnostics, exit 0. The [final verification](final-verification.json) records the complete final source check and production build.                              |
| Core authentication/data             | [CORE_LOCAL.md](CORE_LOCAL.md), [core-local.json](core-local.json): real SMTP OTP, NextAuth, PostgreSQL, Redis and S3; broad run 17/18, then the repaired security flow replay passed 9/9. The original failure remains visible.             |
| Onboarding, upload and redaction     | [extended-local.json](extended-local.json): 14/14 real API checks; trial serialization/blocked users, multipart TUS resume and exact bytes, flattened redaction/old-version preservation/cross-team denial/replay protection.                |
| Public export                        | [marketing-build.json](marketing-build.json): isolated export of ten HTML pages, without backend dependencies. [Marketing browser report](marketing/REPORT.md) distinguishes the initial contrast finding from the final rerun.              |
| Mobile web                           | [Mobile delivery notes](../../docs/roomline/MOBILE_WEB.md), [browser evidence](../revamp/pwa/browser-report.json). Policy tests restrict caching to six fixed public assets; install/offline results are recorded by the actual browser run. |
| Screen coverage                      | [95-template inventory](../../docs/roomline/revamp/SCREEN_INVENTORY.md), [matrix](../../docs/roomline/revamp/SCREEN_CHECK_MATRIX.md). Source coverage does not mean every authenticated screen/state was visually tested.                    |

Commands and safe local service setup are documented in [LOCAL_RUNTIME.md](../../docs/roomline/LOCAL_RUNTIME.md). Private credentials, sessions, OTPs and raw fixture/service-state files stay outside the repository. Screenshots contain clearly synthetic test names and identifiers. Local services are real, isolated development instances; no customer/production data or live payment was used.

Additional final evidence includes [preview membership revocation](preview-access.json), [Slack availability](slack-availability.json), [version publication concurrency](version-concurrency.json), [split-host links](share-origins.json), [post-redaction version privacy](version-privacy.json), and the [authenticated production UI report](authenticated/report.json). The default runtime suite passes **164 tests**, with zero failures and one opt-in database test skipped; the separate real-service proofs are described above. Evidence-tooling tests pass **21/21**. The final strict TypeScript check has **zero diagnostics** and the full production build exits **0**, without adding compiler/build suppression.

Paid mutation routes and owned Stripe/catalog bindings remain unavailable. The app returns actual stored plan entitlement and explicit provider state; unsupported payment, portal, seat and lifecycle controls are disabled. No payment or active subscription is fabricated. Real free/trial entry remains available.

## Hosted release requirements

See [DEPLOYMENT.md](../../DEPLOYMENT.md) and [the concrete Railway plan](../../railway-staging-plan.json). The operator must configure an owned Resend key and verified sender in Railway secret settings and apply the existing reviewed changes from the staging dashboard. Hosted authentication, storage CORS, migrations and health still require verification after deployment. Optional Stripe prices/webhooks, OAuth/SSO, AI, external converters, Tinybird, Slack and background workers have not been verified with owned production providers.

No native app is required under the chosen web-first scope. Browser evidence does not establish physical iOS/Android installation, all assistive technology behavior, or all 95 screen states. Competitor public references inform the design; no measured competitor-superiority or “100x” outcome is claimed.

The final production UI run accepted4/4 default captures (documents and room overview at1440/390), with zero automated Axe violations, no page errors/overflow, working billing aliases and only six public CacheStorage entries. Version privacy passed retained5/5 and independent fresh8/8 real production-mode checks; previously issued URLs/delivered content are not retroactively erased.
