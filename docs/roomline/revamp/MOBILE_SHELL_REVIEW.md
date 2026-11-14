# Mobile shell source repair review

Reviewed 2026-11-14 against the existing Next.js 14 / React 18 / Tailwind 3 application. This records scoped source repairs, not a fresh rendered audit of authenticated screens or a native-app release.

## Implemented

- App content, mobile header, bottom navigation, and menu headers use `--app-mobile-header-height` and `--app-mobile-nav-height`, with matching 3.5rem/4.5rem fallbacks plus safe-area insets. The previous 4rem-versus-4.5rem reserve mismatch is removed in source.
- Added a keyboard skip link to workspace content. Header back/logo/account targets and navigation/menu actions have at least 44px source dimensions; account and close controls have descriptive names.
- Active navigation uses path-segment matching. Room overview no longer selects Documents; singular document detail selects Documents; group analytics remains in Sharing; settings file permissions stays under More. Exact settings destinations avoid marking General current on a child page.
- Active destination links expose `aria-current`. More triggers name their dialog and expose expansion state; disclosure buttons expose expansion/controlled-region state.
- Replaced manual full-screen More overlays and ad hoc body-scroll mutation with the installed Radix Dialog primitive. Dialogs have title/description, default Escape/focus containment/scroll-lock behavior, explicit focus restoration to the invoking control when another dialog has not taken over, and close when switching to the desktop breakpoint.
- Added a distinct Room overview destination. Workflow discovery uses the same rollout flag as desktop/API, keeps the existing plan-upgrade path, and requires team-read permission. Links to the absent billing-upgrade screen were changed to the existing billing screen within these menus.
- Membership loading or unknown membership shows neutral navigation; scoped members keep assigned-room navigation and team switching. Room menus verify assigned scope; frozen or not-yet-loaded rooms do not expose a create-share action. Workspace-wide links/usage/upgrade affordances stay hidden from scoped members. The server remains the actual authorization boundary.
- Customer viewer branding, APIs, stored permissions, billing enforcement, and licensed feature hooks were not replaced or stubbed. No native project was created.

## Source and reference accountability

Read the new `AGENTS.md`, `DESIGN.md`, product intent, reference lock and registry when they appeared during this work, plus the actual local component APIs. Pinned Taste, Awesome DESIGN.md, Playwright and the applicable source-review notes were read; image-to-code was considered and is not applicable to this source-confirmed correction. The actual [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) were refreshed for this pass; the fetched text and body hash are preserved in [the source artifact](../../../artifacts/revamp/mobile-web-interface-guidelines.md). No downloaded instructions or remote scripts were executed.

[Per-reference task decisions](MOBILE_SHELL_REFERENCE_DECISIONS.json) contain exactly one applied/not_applicable/unavailable decision for every registry entry. Applied guidance review is distinguished from generation, installation and runtime verification. No supplied API key was used.

An independent source reviewer found a missing workflow rollout-flag gate in the first draft. That gate was added before handoff; no other concrete new issue was found in that review. Source review cannot establish contrast, screen-reader focus behavior or real-device safe-area behavior by itself.

## Verification and limits

- Four pure navigation regression tests pass: overview versus documents; singular document and group analytics; path-boundary/query handling; exact settings selection. Run `node --import tsx --test lib/navigation/mobile-navigation.test.ts`.
- Targeted Next ESLint on all seven changed source/test files passed with no warnings or errors.
- The 21 local design-gate/MCP tooling tests passed; these validate tooling contracts and mocks, not UI quality or authenticated tool access.
- Ordinary `node scripts/design/check.mjs` was attempted while the root-owned central review manifest had not yet been created, so it could not validate local inputs. No manifest validation pass is claimed by this repair owner.
- Whitespace checks passed. Inventory and feature map validation confirms 88 baseline + 6 new = 94 screen templates, including two dynamic content templates producing four static URLs; six false helper routes were removed from the tool draft.
- No fresh authenticated shell screenshots, focus/keyboard trace, actual-device keyboard/pinch test, storage/billing/access test, or native test was performed by this repair owner. Inherited missing source/service requirements remain; the root review manifest records actual public renders separately. Restoring the runtime and checking both themes at mobile/desktop sizes remain required before a rendered-shell or release claim.
