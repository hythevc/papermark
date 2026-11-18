# Roomline marketing deployment

Published and hosted-verified on 2026-11-18.

- **URL:** [roomline-marketing-hythevc.vercel.app](https://roomline-marketing-hythevc.vercel.app)
- **Target:** production
- **Status:** READY
- **Deployment:** `dpl_EaLxmeV1ykTFsmkxdfyokLQ4FEjg`
- **Reviewed application commit:** `b59108e0b3fa020916af28bb4133ccee7ec824be`
- **Framework:** previously built static HTML/CSS/JavaScript export
- **Provider build duration:** 1565 ms

The exact Jaime team and Roomline marketing project were inspected before publication. The existing tested export's transformed-source digest matched `c3f451b1b1aa26d6b1ec7702b9048a0da9baf1b492950ad95813e00794e7b187`; the public source at the current PR head had no differences from the reviewed application commit. All 48 files in the complete provider inventory match their uploaded SHA1s: 47 public export files and one static routing configuration. The build metadata file was retained locally.

The authenticated SaaS repository, API handlers, environment files, credentials, manifest and service worker were not uploaded. Vercel Authentication was disabled only on this public marketing project; the deployment is anonymously accessible. No Railway settings, application source, Git commits or pushes were changed by this publication.

## Hosted verification

| Check | Result |
| --- | --- |
| Anonymous HTTPS | 21/21 checks passed |
| Public pages | Nine content pages and direct /404 demo return 200; served HTML matches reviewed local bytes |
| Unknown and private routes | Unknown, dashboard, auth, document, room and API URLs return 404 |
| Desktop and mobile | 20/20 captures passed at 1440px and 390px |
| Automated accessibility | Zero Axe WCAG2A/AA and2.1AA violations in captured pages |
| Interactions | Search/filter, empty-state recovery, preview tabs, keyboard FAQ, mobile-menu keyboard/Escape/navigation and unknown-page handling passed |
| Browser health | Zero uncaught errors, unexpected console messages, overflow, private requests or foreign-origin requests |
| App CTAs | Link to `https://roomline-staging-3157af3e.up.railway.app`; links were inspected without navigating to the app |
| Marketing PWA isolation | No manifest, service-worker registration attempts or registrations; /sw.js and /manifest.webmanifest return 404 |

Direct `/404` is a static demonstration page and returns 200. An unknown path receives the custom page with HTTP404. The `/api` namespace returns Vercel's platform404; no API file is deployed.

Manual image inspection confirmed the desktop/mobile homepage layout and the mobile installation guide match the reviewed export. The sample product preview remains labeled as illustrative data.

## Evidence

- [Sanitized deployment details](vercel.json)
- [Anonymous HTTP checks](vercel-http.json)
- [Hosted browser report](vercel-browser/REPORT.md)
- [Desktop homepage](vercel-browser/home-1440-first-viewport.png)
- [Mobile homepage](vercel-browser/home-390-first-viewport.png)
- [Mobile installation guide](vercel-browser/mobile-390-first-viewport.png)

## Post-deployment observations and limits

The deployment's 12 available build events contain no error/failure lines and confirm completion. Browser and HTTP checks passed. No error drain or ongoing monitoring integration was created.

This publication verifies marketing only. It does not establish that Railway authentication, email, storage, payment or other SaaS flows are hosted and working. Automated accessibility and headless viewport checks do not establish complete conformance or physical-device compatibility. The repository was not connected to Vercel for automatic future deployments.
