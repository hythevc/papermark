# Static marketing browser verification

Generated 2026-11-17T02:38:54.647Z. Result: **passed**. Built artifact 2026-11-17T02:37:33.115Z, digest `c3f451b1b1aa26d6b1ec7702b9048a0da9baf1b492950ad95813e00794e7b187`.

One isolated headless Chromium context visited only http://127.0.0.1:3002; foreign and API/auth/backend requests were blocked and reported. No Next server, build, compiler, provider write, app navigation, login or email was used.

| Route | Width | Result | Axe violations | Screenshot |
| --- | --- | --- | --- | --- |
| / | 1440 | passed | 0 | artifacts/runtime/marketing/home-1440.png |
| /product | 1440 | passed | 0 | artifacts/runtime/marketing/product-1440.png |
| /security | 1440 | passed | 0 | artifacts/runtime/marketing/security-1440.png |
| /solutions/fundraising | 1440 | passed | 0 | artifacts/runtime/marketing/solutions-fundraising-1440.png |
| /solutions/due-diligence | 1440 | passed | 0 | artifacts/runtime/marketing/solutions-due-diligence-1440.png |
| /guides | 1440 | passed | 0 | artifacts/runtime/marketing/guides-1440.png |
| /guides/fundraising-checklist | 1440 | passed | 0 | artifacts/runtime/marketing/guides-fundraising-checklist-1440.png |
| /guides/sharing-checklist | 1440 | passed | 0 | artifacts/runtime/marketing/guides-sharing-checklist-1440.png |
| /mobile | 1440 | passed | 0 | artifacts/runtime/marketing/mobile-1440.png |
| /404 | 1440 | passed | 0 | artifacts/runtime/marketing/404-1440.png |
| / | 390 | passed | 0 | artifacts/runtime/marketing/home-390.png |
| /product | 390 | passed | 0 | artifacts/runtime/marketing/product-390.png |
| /security | 390 | passed | 0 | artifacts/runtime/marketing/security-390.png |
| /solutions/fundraising | 390 | passed | 0 | artifacts/runtime/marketing/solutions-fundraising-390.png |
| /solutions/due-diligence | 390 | passed | 0 | artifacts/runtime/marketing/solutions-due-diligence-390.png |
| /guides | 390 | passed | 0 | artifacts/runtime/marketing/guides-390.png |
| /guides/fundraising-checklist | 390 | passed | 0 | artifacts/runtime/marketing/guides-fundraising-checklist-390.png |
| /guides/sharing-checklist | 390 | passed | 0 | artifacts/runtime/marketing/guides-sharing-checklist-390.png |
| /mobile | 390 | passed | 0 | artifacts/runtime/marketing/mobile-390.png |
| /404 | 390 | passed | 0 | artifacts/runtime/marketing/404-390.png |

- Homepage preview search, empty recovery, navigation and keyboard FAQ: passed
- Mobile menu opens by keyboard, closes with Escape/focus restoration and navigation: passed
- Unknown static path uses custom404 and all interactions remain client-only: passed

- Local static-export evidence does not prove hosted Vercel routing or deployment.
- Railway account actions were inspected, not followed; no authentication, API, email, storage or billing flow is verified by this run.
- Axe covers automated WCAG2A/AA and2.1AA checks; it does not establish complete accessibility conformance.
- Headless viewport checks are not physical-device or native-app verification.
