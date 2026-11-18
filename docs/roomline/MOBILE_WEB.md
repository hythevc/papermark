# Installable mobile web app

Roomline is an installable web app. The public guide is `/mobile`, linked from the marketing footer. It retains the same server-backed workspace, authentication, permissions and document flows. This work does not add Expo, a native iOS/Android application, push notifications, background uploads or offline documents.

The selected hosting split is static marketing on Vercel and the complete SaaS on Railway. Installation belongs only to the configured Railway app origin. The marketing export omits registration and manifest metadata; its guide links to the app. The planned staging origin is `https://roomline-staging-3157af3e.up.railway.app`; this is a configuration target, not a deployment or availability claim.

## Installation

- **Android / supporting desktop browsers:** visit the deployment's configured app origin over HTTPS, open `/mobile`, and use “Install Roomline” when the browser supplies a real `beforeinstallprompt` event. The browser menu may instead offer “Install app” or “Add to Home screen.” Browser support, engagement policy and existing installation affect availability.
- **iPhone / iPad:** open the app origin in Safari, choose Share → Add to Home Screen, keep “Open as Web App” enabled if offered, then choose Add. This is a manual Safari flow; no Chromium-style prompt is promised.
- The installed app starts at `/datarooms`. Existing authentication middleware redirects unsigned-in users to sign in. Installation grants no additional permissions.
- A secure context is required; `http://localhost:3000` is used only for local browser verification. Production installation requires an owned HTTPS app origin.

## Host and data boundaries

`lib/pwa.ts` permits registration only at the exact `BRAND.appUrl` origin, including scheme and port. Explicit API, MCP and webhook host exclusions take precedence. Customer domains, separate marketing origins, embedded frames and insecure contexts do not register the worker or receive a conditional install button. Pages Router metadata appears only after the browser confirms eligibility; App Router metadata checks the request host.

Middleware permits only the eight exact installation asset paths, after existing API, webhook and customer-domain isolation. The manifest and worker are publicly available on the app host without authentication. This does not make other application paths public. Service-worker scope is `/` so an installed app can display a reconnect screen on navigation failure.

`public/sw.js` caches exactly six public installation resources in `roomline-public-v1`:

- `/offline.html`
- `/icons/roomline.svg`
- `/icons/roomline-192.png`
- `/icons/roomline-512.png`
- `/icons/roomline-maskable-512.png`
- `/icons/apple-touch-icon.png`

Precache requests omit credentials and reject redirects, failed statuses and unexpected MIME types. Static cache matching requires same origin, GET and no query string. Authorization-bearing requests, non-GET requests, foreign origins and API/MCP/OAuth/Next.js data paths bypass the worker's fetch handling.

Other navigations use the network without storing their responses. A network failure returns the generic reconnect page; online redirects, permission denials and server errors remain server responses. No workspace HTML, account data, document, download, API response or Next.js data is added to Cache Storage. The worker does not change browser HTTP caching, cookies, local storage or user-initiated downloads. It removes only old caches in its own `roomline-public-` namespace.

The offline page contains no saved account or room data. Its retry action reloads the current address after a connection returns. It does not simulate a workspace or promise queued changes.

## Identity and accessibility

The SVG identity comes from the existing Roomline mark. PNGs are deterministic rasterizations at 192px, 512px and 180px. The maskable 512px icon uses an opaque forest background and keeps the mark inside the safe circle. No new image provider or third-party asset is used.

The install guide follows the existing semantic tokens and local Button, with 44px controls, normal keyboard semantics, visible focus, useful link names and live install status. The reconnect page uses the same paper/forest direction with safe-area padding and a 48px retry action. Zoom remains enabled. The 34 source/tool decisions for this task are recorded in `artifacts/revamp/pwa/reference-decisions.json`; they distinguish guidance review from tool execution.

## Verification

Automated worker/middleware policy tests are in `scripts/runtime/pwa-policy.test.mjs`: `node --test scripts/runtime/pwa-policy.test.mjs` passed 18 tests with zero failed or skipped. Host/path tests and public-route tests are in `lib/pwa.test.ts` and `lib/marketing-routes.test.ts`: `node --import tsx --test lib/pwa.test.ts lib/marketing-routes.test.ts` passed 7 tests. Targeted PWA lint passed. The authoritative frozen-source record at `artifacts/runtime/final-verification.json` records zero strict compiler diagnostics and a successful production build, with no check bypasses.

Real Chromium checks are in `scripts/runtime/pwa-browser.cjs`. The completed run used a temporary persistent, unauthenticated profile on port 3000; the profile was deleted afterward. It passed **8 checks** covering real service-worker control, manifest/icon metadata, empty CDP installability errors, exactly six public cache entries after negative probes, offline fallback, failed offline API access and reconnect retry restoring the server sign-in flow. No page errors were recorded. The offline screenshots at 390px and 1440px were inspected for readable content, visible retry and no clipping/overflow. Evidence is in `artifacts/revamp/pwa/browser-report.json` and the two `offline-*.png` images.

The natural `beforeinstallprompt` event was not observed in this headless run, so the conditional install button was not exercised through a genuine prompt. No event was synthesized. Earlier fetch-timeout and incognito-profile attempts are archived separately and do not count as passes.

These headless Chromium checks establish registration and installability diagnostics for the tested local origin. They do not prove installation on an Android launcher, an iOS home screen, an app store or a physical device. Manual Android/iOS installation remains a device acceptance check, and deployment has not been performed by this task.

A later real production run loaded the authenticated documents library and one owned room overview at 1440px and 390px. Its CacheStorage still contained exactly the six public resources after actual workspace data loaded. All four saved images were individually inspected, with zero automated Axe violations and no page JavaScript exceptions. The focused report at `artifacts/runtime/authenticated/report.json` preserves its console/provider limits; it does not establish every screen, state, theme or accessibility criterion.
