# Roomline launch requirements and verification

## Current status

This is a development rebrand and UX release, not a deployed SaaS. The public homepage, sample preview, and account entry screens have been exercised in Chromium. Real authentication/email delivery, tenant data access, uploads, payments, and analytics have not been end-to-end verified because no service credentials are attached and the original checkout has missing source dependencies.

## Source and production blockers

A clean typecheck of the untouched repository produced 203 diagnostics, including 127 missing-module errors. The final integrated comparison produced 201 diagnostics: no new normalized errors, and two removed unresolved imports from inherited referral menus. See `artifacts/typecheck-comparison.json`. Examples of remaining missing modules:

- `ee/features/branding/lib/brand-logo` and related branding resolvers;
- request-list hooks and viewer components;
- confidential-view and redaction components;
- `ee/stripe/currency`, plus billing type/Stripe API shape drift;
- `lib/oauth/scopes`, API error helpers, and conversion/background-job modules;
- missing `@react-email/components` dependency used by existing EE templates.

Restore the intended compatible source/version and dependencies or implement independently specified replacements. Do not stub access controls, expose private data, suppress TypeScript/build failures, or claim protected features work merely to get a green build.

The root AGPLv3 license and the separate enterprise commercial license are unchanged. Covered enterprise data room/server features require the relevant production entitlement or independent replacements. Determine the distribution/source-availability obligations for the actual deployment.

## Configuration

Use an owned app domain. Set **both** `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL` to the same app origin. Set `NEXT_PUBLIC_APP_BASE_HOST` to its bare hostname and `NEXT_PUBLIC_MARKETING_URL` to the public marketing origin. Browser-shared branding uses public settings only, avoiding server/client URL mismatches.

Keep session cookies host-only unless an intentional shared subdomain deployment requires `NEXTAUTH_COOKIE_DOMAIN`. Use HTTPS in production and set a unique `NEXTAUTH_SECRET`. Customer-owned custom domains continue through the separate shared-link resolver.

Configure PostgreSQL, chosen storage transport, Redis/rate limits/locks, Resend with a verified sender, and required queues, jobs, conversion workers, analytics, and any enabled identity providers. Configure these via environment secret settings; do not commit credential values.

Set `EMAIL_FROM` to a verified sender owned by the business. Optional sender overrides, reply-to, postal address, and unsubscribe settings are documented in `.env.example`. Inherited explicit upstream senders in the lifecycle helpers have been removed. Some untouched lifecycle/EE template bodies, subjects, and destination links still contain upstream identity; audit and migrate these before enabling their workflows. Billing copy/links and guest-viewer fallback branding also need a complete release audit after the missing source is restored.

Provide real support and legal policy URLs. Confirm the working brand name's domain/trademark availability. Configure owned Stripe products, price IDs, plan entitlements, portal, and webhook signing secret. Replace inherited customer testimonials or third-party proof only with substantiated, authorized material.

## Release checks

Before production, complete a real staging flow: register → receive and redeem login code → create room → upload/process a document → review permissions → share → verify allowed guest access → reject unauthorized guest access → revoke link → confirm revocation. Include cross-tenant and scoped-member negative tests. Verify password, expiration, download, and confidential-view rules in the server path. Verify payment/webhook idempotency and cancellation independently.

Verify backup/restore, error reporting, queue failures, storage retention/deletion, rate limits, analytics integrity, and service-specific secrets. Configure only the features the deployment actually supports.

## Verification performed for this release

- Targeted Next ESLint on all changed TypeScript/TSX files: passed.
- Sender/template regression tests: run `npm run test:roomline`. No real emails are sent by these tests.
- Axe-core checks for WCAG 2 A/AA and 2.1 AA tags found zero automated violations across the four desktop preview states and mobile navigation after contrast fixes.
- Homepage Chromium interaction checks: preview section navigation, sample-document search/no-results recovery, FAQ keyboard activation, mobile menu closure, CTA targets, and no horizontal overflow at 320, 390, 768, 1024, and 1440 pixels.
- `/login` and `/register`: HTTP 200 and own-brand UI rendering. Registration success/error recovery and transition to code entry were exercised with mocked NextAuth API responses; no real email was sent. Successful credential exchange and email delivery remain unverified.
- Domain/auth runtime checks: exact configured hosts, protected route redirects, public registration, unsafe/encoded return paths, custom/API host isolation, cookie transport consistency, optional Hanko, and public URL parity.
- Full repository typecheck: blocked by inherited diagnostics, compared against untouched HEAD to detect regressions.
- Production build: blocked by inherited unresolved source modules; no build/typecheck bypass was added.
- Authenticated room UI browser checks: the local request returns HTTP 500 for missing `ee/stripe/currency`; card rendering checks and scoped source/lint checks passed.

Screenshots and automated accessibility results are in `artifacts/`. Automated checks do not establish complete WCAG conformance or production security.
