# Roomline design system

Roomline helps deal teams understand what is ready, who can access it, and what needs attention next. The visual system should make confidential document work calm, readable, and explicit. [AGENTS.md](AGENTS.md) defines the workflow; [product intent](docs/roomline/PRODUCT.md) defines scope; [the reference lock](docs/roomline/revamp/REFERENCE_LOCK.md) defines the chosen direction.

## Identity and surface modes

Use Roomline's forest, paper, and charcoal identity, with sage accents. Attio informed architectural alignment and product-led composition; a static Linear study informed spacing and hierarchy. Their brand colors, proprietary fonts, imagery, customer proof, and exact compositions are not Roomline assets. The [reference reviews](docs/roomline/revamp/REFERENCE_REGISTRY.md) reconcile conflicting prescriptions.

| Mode | Purpose | Composition |
| --- | --- | --- |
| Persuade | Public marketing helps a buyer understand value and take a next step | Clear offer, concrete copy, useful product demonstration, structural rules, restrained accent. Label samples as illustrative. |
| Operate | Workspace, rooms, files, access, requests, analytics, billing | Familiar navigation, readable rows, predictable controls, compact hierarchy, immediate feedback, quiet chrome. |
| Read | Help, setup, policy, documentation | Readable line length, clear headings, linked sources, predictable navigation. |

Do not turn operational screens into marketing heroes. Do not fill proof sections with invented logos, deal amounts, testimonials, certifications, availability promises, or prices.

## Canonical foundations

The actual CSS source is [styles/globals.css](styles/globals.css); Tailwind mappings live in [tailwind.config.js](tailwind.config.js). Change tokens there and review affected surfaces rather than introducing competing values in this document. Both light and dark themes are supported. Avoid hardcoded light surfaces on dark routes.

| Semantic role | Tokens / usage |
| --- | --- |
| Canvas, operational panel, raised overlay | `background`, `card`, `popover`; aliases `--surface-canvas`, `--surface-panel`, `--surface-paper` |
| Main and secondary text | `foreground`, `muted-foreground`; aliases `--text-primary`, `--text-secondary` |
| Primary action | `primary` / `primary-foreground`; forest on light, readable sage treatment on dark |
| Quiet action / selection | `secondary`, `accent` and matching foregrounds; selection is not a success state |
| Boundaries and focus | `border`, `input`, `ring`; visible focus cannot disappear into selected or dark surfaces |
| Destructive action and status | `destructive`, `warning`, `--status-success-*`, `--status-warning-*`, `--status-info-*`; always accompany color with text/icon meaning |
| Application navigation | `sidebar-*`; use the same role meanings across themes |
| Customer-owned room branding | Existing branding fields and viewer contracts; never override these globally with Roomline's app palette |

Typography: retain the existing Inter integration with the documented UI/system fallback; no new font dependency is required by a style reference. Use a compact operational scale around 14–16px for controls/body, 12–14px for supporting metadata, and 20–30px for workspace hierarchy. Marketing body is at least 16px; display headings generally 48–72px desktop and 36–44px mobile. Avoid tiny screenshot-like text as interactive controls. Use tabular numerals for comparable metrics, preserve filenames, and format dates/numbers with locale-aware tools.

Spacing follows 4/8/12/16/24/32/48/64/96px roles. Use shared page gutters, aligned section edges, and purposeful whitespace. Current global radius is 12px with derived control radii; keep nested geometry consistent. Prefer borders and tonal surfaces for structure; reserve subtle shadows for raised layers. Do not add ornamental nested cards to simple lists.

Roomline targets at least 44×44px interactive touch areas; compact desktop visuals can remain denser when their hit area is safe. This is a product target, not a claim about universal WCAG AA wording. Validate actual contrast against the chosen accessibility criteria; 4.5:1 normal text and 3:1 large text/non-text are review targets where applicable, not claims that all legacy surfaces already pass.

## Component recipes and state vocabulary

Inspect [local UI primitives](components/ui) before composing. `Button` supports `loading` and Radix `asChild`; preserve loading semantics, activation prevention, and label/geometry. Do not import missing components or duplicate controls from a registry because newer upstream docs use a different API.

| Component / flow | Required applicable behavior |
| --- | --- |
| Button and icon action | Descriptive name, default/hover/focus/pressed, disabled/pending, stable dimensions, visible result; destructive styling only for destructive actions |
| Form / authentication | Persistent label, useful autocomplete/input mode, validation near field and announcement, preserved input, paste support, recoverable failure, no false successful send |
| Dialog / sheet / menu | Accessible title, focus entry/trap/return, Escape and dismissal rules, visible close action, safe areas, scrollable content without hiding actions |
| Files / table / list | Long names, empty first-use vs filtered-empty vs failed fetch, loading/processing, selection/bulk feedback, understandable sort/filter, retry, permission/read-only state |
| Share / permissions | Named audience, effective scope, verification/download/expiry summary, preview where implemented, explicit active/uncreated/expired/revoked link state |
| Room readiness / requests | Missing items, owners, pending upload/processing, failed recovery, unanswered request, completion; counts derive from real records |
| Analytics | Named time period and event meaning, empty/error states, accessible labels, non-color-only encoding; engagement is not proof of investor intent |
| Notification / toast | Outcome and next action, appropriate live region, dismiss/retry where useful; never the only location for a form error |

The [screen inventory](docs/roomline/revamp/SCREEN_CHECK_MATRIX.md) is source evidence. A listed state marker is not a passed interaction or rendered check. Record the actual runtime status in the review manifest.

## Responsive and motion behavior

- Recompose rather than compress: single-column forms, usable sheets, wrap-safe toolbars, clear mobile navigation, and visible primary actions. Tables can use an intentional contained scroll region where reading the relationships requires it; the entire page should not overflow horizontally.
- Test 390px and desktop, then intermediate widths and small laptop heights where layout changes. Check long filenames, locales, empty/error data, safe areas, fixed chrome, and the on-screen keyboard where a real mobile runtime is available. Desktop resizing is not real-device verification.
- Preserve browser zoom. Avoid interaction that requires hover; gate hover decoration by pointer capability. Do not hide essential room, access, or recovery controls on narrow screens.
- Use short explicit-property transitions, normally `--motion-fast` (150ms) or `--motion-standard` (200ms), with the shared easing. Frequent keyboard and file actions can be immediate. No compulsory shader, scroll choreography, animated number, or page entrance.
- Honor reduced motion and avoid `transition: all`. Motion must explain feedback, continuity, or state; disabling it must retain all information and operation.

## Intentional exceptions and unresolved work

Use sentence case in Roomline copy despite one upstream Title Case rule. Keep the installed UI font despite reference font bans. Keep native controls/Radix semantics despite reference mandates to rebuild them. Preserve server features despite Taste's static-export recipe. Do not adopt React19/Tailwind4 or native Rust/Swift frameworks as side effects of design work.

Missing enterprise modules, unconfigured services, and native source absence remain explicit limitations in [the roadmap](docs/roomline/revamp/100X_PLAN.md). Public renders and shared primitive changes do not establish that every authenticated route, plan, role, or viewer state works. A valid evidence manifest checks accountability and source freshness; it does not certify visual quality, security, or business launch readiness.
