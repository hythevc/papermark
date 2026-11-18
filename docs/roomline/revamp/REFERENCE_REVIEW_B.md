# Design reference review B

Reviewed 2026-11-14 for Roomline, an existing Next.js 14 / React 18 / Tailwind 3 application with locally owned shadcn-style Radix components. This document records each requested reference separately and distills policy for this repository. It is a reference review, not a claim that an upstream toolkit was installed, its commands ran, or its quality claims were independently verified.

Only primary public source text was downloaded. No remote installer, downloaded script, hook, CLI engine, or skill binary was executed. Downloads and source manifests are outside the repository in `/workspace/scratch/ref-b/` and `/workspace/scratch/ref-b-subset/`. No service key was used or copied into this report. The short aliases `c46/awesome-design-md` and `c52/shadcn` failed; the root agent subsequently read both cloud skills via their canonical package URIs and applied the selected Linear study and installed shadcn workflow. Primary upstream sources were also reviewed.

## One-by-one status

| ID | Requested reference | Status and actual coverage | Fit for Roomline |
| --- | --- | --- | --- |
| B01 | `elayadesign/ai-design-skills` | README; landing-page-design skill; relevant Figma foundations, tokens, state and layout sections read | Marketing structure, real claims, consistent foundations. Its fixed personal visual rules need reconciliation. |
| B02 | `emilkowalski/skills`, including `apple-design` | README; apple-design; design-engineering decision framework; animation review/performance and mobile-web sections read | Strong fit for precise web interactions, restrained motion and mobile browser behavior. |
| B03 | `plugin87/ux-ui-agent-skills` | README release/architecture sections; AGENTS; design-doctrine, redesign, tokens, a11y, review, image-to-code, screen and writing skills; relevant Next adapter/rules read | Token/state discipline and evidence-based verification. Guidance only: its full gate kit was not installed or run. |
| B04 | `pbakaus/impeccable` | README, central skill; Operate and craft-floor references; context/hardening/documentation references inspected | Particularly useful distinction between persuasive marketing and task-oriented product UI. No binary, detector, live overlay or hook run. |
| B05 | `nextlevelbuilder/ui-ux-pro-max-skill` | README overview; UI/UX Pro Max skill; design-system and ui-styling skills; quick-reference/pro-rules sections inspected | Structured design decisions and shared tokens. No search database output or generated design system claimed. |
| B06 | `tasteskill.dev` | Public homepage HTML and extracted readable text read | Overview and examples only. Marketing claims about corpus size and output quality were not independently verified. |
| B07 | `Leonxlnx/taste-skill`, including image-to-code | README and main skill read; README's move notice followed to `Leonxlnx/imagegen-skills`; its README and image-to-code workflow, extraction and responsive sections read | Useful visual-reference workflow, subject to important static-export and scope conflicts below. |
| B08 | `vercel-labs/agent-skills` web-design-guidelines | README, wrapper skill, and the actual linked current web-interface-guidelines `command.md` read | Directly applicable web review checklist. |
| B09 | `VoltAgent/awesome-design-md` | README/catalog read; tree inspected, no SKILL.md found | Inspiration index and DESIGN.md convention. Not evidence that its linked 84 design analyses were all reviewed. |
| B10 | `microsoft/playwright-cli` | README, SKILL.md, test-generation, request-mocking and storage-state references read | Browser interaction evidence and reproducible web QA. No CLI installation or execution. |
| B11 | `shadcn-ui/ui` | README, shadcn skill, design-system, styling and Base-vs-Radix references; current docs-app manifest read | Reuse local components and semantic tokens. Latest upstream APIs are not this repo's installed APIs. |

## Source record

The following resolved revisions identify the reviewed default branches. Fifteen central README/SKILL/AGENTS downloads from B01–B07 were also compared with their revision-pinned raw files; all fifteen matched. Source manifests and content hashes remain in scratch. External websites can change independently of these Git revisions.

| Source | Resolved revision |
| --- | --- |
| elayadesign/ai-design-skills | [`456d9e0d3e2d84c748bb143c6ca3d90c45e16213`](https://github.com/elayadesign/ai-design-skills/commit/456d9e0d3e2d84c748bb143c6ca3d90c45e16213) |
| emilkowalski/skills | [`0f2e23b32bb1265e84cff8d3e75785fec953fb1b`](https://github.com/emilkowalski/skills/commit/0f2e23b32bb1265e84cff8d3e75785fec953fb1b) |
| plugin87/ux-ui-agent-skills | [`f823acedc3ef4e9b2ba944a28fd86fe2abdde427`](https://github.com/plugin87/ux-ui-agent-skills/commit/f823acedc3ef4e9b2ba944a28fd86fe2abdde427) |
| pbakaus/impeccable | [`1995764b4936f2bfbf4eb719cb37b384a45ceacb`](https://github.com/pbakaus/impeccable/commit/1995764b4936f2bfbf4eb719cb37b384a45ceacb) |
| nextlevelbuilder/ui-ux-pro-max-skill | [`d643997c82e94742dd3bee43210b0198e8bbba3d`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/commit/d643997c82e94742dd3bee43210b0198e8bbba3d) |
| Leonxlnx/taste-skill | [`f6b76575f949707b4e3c37cd86cb44b0b98643e8`](https://github.com/Leonxlnx/taste-skill/commit/f6b76575f949707b4e3c37cd86cb44b0b98643e8) |
| Leonxlnx/imagegen-skills | [`beb16b0d0f4dae9a6f5cb04ea41e97b93a54ab8e`](https://github.com/Leonxlnx/imagegen-skills/commit/beb16b0d0f4dae9a6f5cb04ea41e97b93a54ab8e) |
| vercel-labs/agent-skills | [`1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`](https://github.com/vercel-labs/agent-skills/commit/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62) |
| VoltAgent/awesome-design-md | [`fcc70284932276d085f01ef9f83edde90b1258cb`](https://github.com/VoltAgent/awesome-design-md/commit/fcc70284932276d085f01ef9f83edde90b1258cb) |
| microsoft/playwright-cli | [`b21724888b8100b05ef8dee3a92f2bb03bf4dcde`](https://github.com/microsoft/playwright-cli/commit/b21724888b8100b05ef8dee3a92f2bb03bf4dcde) |
| shadcn-ui/ui | [`e62c9435fff729a175f38983dee73b2cb4f6a069`](https://github.com/shadcn-ui/ui/commit/e62c9435fff729a175f38983dee73b2cb4f6a069) |

## B01: Elaya design skills

Primary instructions: [README](https://github.com/elayadesign/ai-design-skills/blob/456d9e0d3e2d84c748bb143c6ca3d90c45e16213/README.md), [landing-page-design](https://github.com/elayadesign/ai-design-skills/blob/456d9e0d3e2d84c748bb143c6ca3d90c45e16213/skills/landing-page-design/SKILL.md), [figma-designer](https://github.com/elayadesign/ai-design-skills/blob/456d9e0d3e2d84c748bb143c6ca3d90c45e16213/skills/figma-designer/SKILL.md).

Apply:

- Establish the audience, offer, primary action and actual product capabilities before choosing page sections. The marketing page should answer what Roomline does and where the visitor goes next.
- Draft concrete copy and build section by section. Preserve a clear relationship between the claim, evidence, visual and action.
- Never invent customer endorsements, prices, certifications, conversion numbers or guarantees. A required proof section is omitted until real proof exists; fictional preview data stays labeled as illustrative.
- Define named typography, spacing and semantic color roles. Document default, hover, pressed, focus, disabled, pending, error and selected behavior where applicable.
- If Figma work is requested, reuse existing libraries and variables; bind light/dark modes, spacing and text styles; use auto layout and real component states. Figma artifacts are not necessary for every web edit.

Do not adopt wholesale: its ban on Inter/system fonts, exclusive icon-library list, mandatory floating blurred navigation, 500ms base motion, per-word scroll reveal and mandatory gradient headline are one author's style recipe. The Figma skill itself allows any brand font while the landing skill bans several. They cannot all be universal repository rules. Its useful content-realism rule takes precedence over filling a page with nonexistent social proof or free-trial guarantees.

## B02: Emil Kowalski and Apple design

Primary instructions: [README](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/README.md), [apple-design](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/skills/apple-design/SKILL.md), [emil-design-eng](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/skills/emil-design-eng/SKILL.md), [review-animations](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/skills/review-animations/SKILL.md), [animation-performance](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/skills/animation-performance/SKILL.md), [mobile-native](https://github.com/emilkowalski/skills/blob/0f2e23b32bb1265e84cff8d3e75785fec953fb1b/skills/mobile-native/SKILL.md).

`apple-design` explicitly translates Apple principles into web CSS, Pointer Events and motion libraries. It is not a request to convert Roomline to SwiftUI, use iOS layouts everywhere, distribute Apple's font assets, or add native APIs.

Apply:

- Make actions respond immediately; do not insert artificial waits. Keep keyboard-driven, frequent data-room actions instant or nearly so.
- Require a reason for motion: feedback, spatial continuity, explaining a state, or preserving context. Prefer removing irrelevant animation to adding decoration.
- Keep popovers anchored to their trigger and transitions interruptible. Use existing overlay primitives for focus, dismissal and portals.
- Prefer explicit `transform`/`opacity` transitions to `transition: all`; profile busy screens before attributing smoothness to GPU acceleration. Roomline currently has Motion 12, so source examples specifically describing Motion 14.2 are version-dependent advice, not existing capability.
- Honor reduced-motion preferences. Avoid layered translucency that undermines document or permission readability. Solid surfaces are a valid implementation of the underlying clarity principle.
- On mobile web, preserve zoom, use readable input type, handle safe areas, use appropriate `dvh`/`svh`, and gate hover effects by pointer capability. Real-device keyboard and touch behavior remain unverified by desktop emulation alone.
- Use clear wayfinding, consistent controls, forgiving errors and reversible actions. Only genuinely destructive actions need confirmation.

Initial-response scripts in these source skills are invocation boilerplate, not content to copy into Roomline UI or a reason to stop an already authorized task.

## B03: UX/UI Agent Skills / XIAS

Primary instructions: [README](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/README.md), [AGENTS](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/AGENTS.md), [design-doctrine](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/design-doctrine/SKILL.md), [redesign](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/redesign/SKILL.md), [design-tokens](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/design-tokens/SKILL.md), [a11y-audit](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/a11y-audit/SKILL.md), [design-review](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/design-review/SKILL.md), [image-to-code](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/image-to-code/SKILL.md), [design-screen](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/design-screen/SKILL.md), [UX writing](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/.claude/skills/ux-writing/SKILL.md), [Next adapter](https://github.com/plugin87/ux-ui-agent-skills/blob/f823acedc3ef4e9b2ba944a28fd86fe2abdde427/frameworks/nextjs.md).

Apply:

- Audit existing behavior before redesign. Retain routes, contracts, access enforcement, input and working flows.
- Use primitive → semantic → component token roles; preserve one shared source of visual truth, with themes expressed at the semantic layer. A full DTCG build pipeline is optional, not a prerequisite for improving this existing Tailwind system.
- Use intent consistently: primary action, neutral secondary action, destructive action, selected state and status must be distinguishable by semantics as well as appearance.
- Verify loading, empty, error, selected, disabled and focus states. Differentiate no data, no filtered matches and failed data retrieval.
- Keep findings criterion-linked and evidence-based. A skipped browser check is not a pass. Automated checks do not prove visual quality or complete WCAG conformance.
- Errors explain what failed and the recovery; button labels name the outcome; confirmations name the object rather than using generic “OK”.

Important limits and contradictions:

1. This toolkit is not installed here. No contrast ratio, gate score, “all states pass” or toolkit `N/N` result is claimed.
2. Its `design-doctrine` and `design-screen` call `accuracy_report.mjs` a required downstream finish check. The same revision's root AGENTS explicitly says that command is the kit's own self-test and must run only inside the kit clone. Do not use its self-test score to describe Roomline. Run appropriate project-specific checks instead.
3. The Next adapter targets Next 15 / React 19 App Router, including Promise-valued params and server-action patterns. Roomline mixes Next14 Pages and App routers. Copying the adapter wholesale would break assumptions; preserve the local routing/data model.
4. Its native-select ban and universal 2.5× heading rule are style opinions. Do not replace a working accessible select with a custom widget or inflate dense tool headings merely to satisfy a detector.
5. Toolkit claims about library size, gates and measured source sites are upstream claims, not measurements of Roomline.

## B04: Impeccable

Primary instructions: [README](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/README.md), [central skill](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/.agents/skills/impeccable/SKILL.md), [Operate](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/.agents/skills/impeccable/reference/operate.md), [craft floor](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/.agents/skills/impeccable/reference/craft-floor.md), [hardening](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/.agents/skills/impeccable/reference/harden.md), [document](https://github.com/pbakaus/impeccable/blob/1995764b4936f2bfbf4eb719cb37b384a45ceacb/.agents/skills/impeccable/reference/document.md).

Apply separate surface modes:

- **Persuade:** public marketing explains the offer and earns a next action.
- **Operate:** rooms, permissions, tables, settings and uploads favor scanability, familiar controls, restrained color and prompt feedback.
- **Read:** help and documentation favor structure, readable measure and navigation.

For Roomline's Operate surfaces, familiar sidebars/tabs/tables and one well-tuned UI family are strengths. Use a compact fixed `rem` type scale, structural responsive changes, semantic status colors and short state transitions. Do not put orchestrated page-load animation or a display face in dense file labels. Overlays should escape clipping containers through the existing portal/dialog primitives. Preserve behavior during refinement and state which product truths remain constraints during a redesign.

Persist product intent separately from visual language: PRODUCT.md explains users and tasks; DESIGN.md explains tokens, geometry, states, responsive behavior and intentional exceptions. Source-linked decisions are more useful than a copy of an upstream rules file.

No installer, self-downloaded engine or edit hook was run. In particular, the README describes a live-copy fallback that can invoke an agent CLI with approval/sandbox checks bypassed when a chat session is not polling. That behavior is unnecessary for this work and is not a policy to adopt. Future tool use must remain within the user's existing authorization and normal execution boundaries.

## B05: UI/UX Pro Max

Primary instructions: [README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/README.md), [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/.claude/skills/ui-ux-pro-max/SKILL.md), [design-system](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/.claude/skills/design-system/SKILL.md), [ui-styling](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/.claude/skills/ui-styling/SKILL.md), [quick reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/.claude/skills/ui-ux-pro-max/references/quick-reference.md), [pro rules](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/d643997c82e94742dd3bee43210b0198e8bbba3d/.claude/skills/ui-ux-pro-max/references/pro-rules.md).

Apply its priority order: accessibility and interaction correctness before style, then responsive composition, typography, meaningful motion, forms and navigation. Detect the actual stack rather than assuming a framework. Use one dominant design question at a time; separate UX outcomes from implementation advice. Persist verified decisions in a master system with narrow surface notes; do not regenerate or overwrite established choices silently.

Useful checks include labels, focus, useful autocomplete, field-level errors, progress/pending feedback, preserved image dimensions, no disabled zoom, non-color-only charts, deep links and predictable back behavior. The three-layer token model and component state matrix fit the existing local components.

No search script was run, so no palette, style, chart or stack result is represented as a verified database match. The fixed 44px touch target is a useful Roomline design target, not a statement that WCAG AA universally demands 44px. Avoid inferring universal animation from its “no 0ms” anti-pattern: repeated keyboard and tool actions can appropriately be instant. Its Tailwind4/Vite/new-project setup snippets and slide/canvas workflows do not apply to this existing Next14 application.

## B06–B07: Taste Skill and image-to-code

Primary instructions: [tasteskill.dev](https://tasteskill.dev/), [taste-skill README and moved-skill notice](https://github.com/Leonxlnx/taste-skill/blob/f6b76575f949707b4e3c37cd86cb44b0b98643e8/README.md#moved-skills), [taste-skill main skill](https://github.com/Leonxlnx/taste-skill/blob/f6b76575f949707b4e3c37cd86cb44b0b98643e8/skills/taste-skill/SKILL.md), [imagegen-skills README](https://github.com/Leonxlnx/imagegen-skills/blob/beb16b0d0f4dae9a6f5cb04ea41e97b93a54ab8e/README.md), [current image-to-code skill](https://github.com/Leonxlnx/imagegen-skills/blob/beb16b0d0f4dae9a6f5cb04ea41e97b93a54ab8e/skills/image-to-code/SKILL.md).

The requested image-to-code reference no longer lives in the current taste-skill tree. Its README explicitly relocates it to `Leonxlnx/imagegen-skills`, so that source was followed and read. The website and repo describe somewhat different workflow generations and script names; the website is an overview, not executable version documentation.

Apply:

- Choose a deliberate visual direction instead of averaging attractive snippets. Explain how it serves a finance/document workflow.
- For an approved image-led marketing redesign, produce readable references at useful section/detail scale, analyze layout/type/spacing/components, extract a shared system, then compare the actual render against the reference.
- Keep typography, repeated edges, spacing, component families and media aspect ratios coherent. Test the first viewport on a small laptop as well as a phone.
- Use real owned product imagery or clearly labeled illustrative UI. Do not present stock imagery, fictional room contents or borrowed customer brands as proof of this business.
- Keep style coherent across multiple images and sections. Avoid unreadable collage boards, decorative pseudo-technical labels and excessive nested containers.
- Inspect actual rendered results across responsive sizes; report failed checks and missing assets honestly.

Do not apply its turnkey workflow literally:

- The current taste-skill asks Next projects to use `output: 'export'`. Roomline's authentication, APIs, middleware and server features require a running server. A static-export conversion would be incompatible with the product.
- Mandatory hero entrances, randomly dealt palettes, one or two page “moments”, WebGL/shaders and one-section-per-screen rules are marketing recipes, not requirements for permission sheets and document tables.
- Do not regenerate an already approved system for each route. Do not require image generation for a small bug fix, an accessibility correction or a known component state.
- More reference images are useful only when they resolve an actual design uncertainty. Image fidelity cannot supersede accessibility, real copy or working behavior.
- No Taste scripts, finish hooks, asset downloads or image-generation commands were executed during this review. Corpus/example counts and claimed inspection results belong to the source, not to Roomline.

## B08: Vercel Web Design Guidelines

Primary instructions: [agent-skills README](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/README.md), [web-design-guidelines skill](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/web-design-guidelines/SKILL.md), and its actual linked rules source [web-interface-guidelines/command.md](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), fetched 2026-11-14.

Apply semantic links/buttons/tables; descriptive names for icon buttons; hidden decorative SVGs; unobscured focus; live status/error feedback; normal form types and autocomplete; recoverable inline errors; preserved input; paste-friendly authentication; reduced motion; reserved media dimensions; locale-aware numbers/dates; long-name/zero-data handling; useful URL-backed filters; and confirmation or undo for destructive changes. Audit output should cite concise file/line evidence.

Do not add duplicate keyboard handlers to controls whose native semantics already handle them. A recommendation to virtualize long lists is a performance hypothesis to measure, not a demand for another dependency. Not every ephemeral menu state or keystroke needs a URL. This source uses Title Case while several writing references prefer sentence case; choose one Roomline convention and document that exception rather than mixing them.

## B09: Awesome DESIGN.md

Primary source: [README/catalog](https://github.com/VoltAgent/awesome-design-md/blob/fcc70284932276d085f01ef9f83edde90b1258cb/README.md).

Use the distinction between AGENTS.md for agent process and DESIGN.md for visual language. Write Roomline's own foundations and state matrix with links to its actual components. The catalog is an inspiration index, not an installed framework, a measured audit of Roomline or proof that all linked analyses are current. Named inspiration must be inspected before its detailed visual properties are asserted. No third-party logos, testimonials, proprietary fonts or brand assets are licensed by their presence in an inspiration catalog.

## B10: Playwright CLI

Primary sources: [README](https://github.com/microsoft/playwright-cli/blob/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/README.md), [skill](https://github.com/microsoft/playwright-cli/blob/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/skills/playwright-cli/SKILL.md), [tests](https://github.com/microsoft/playwright-cli/blob/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/skills/playwright-cli/references/playwright-tests.md), [request mocks](https://github.com/microsoft/playwright-cli/blob/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/skills/playwright-cli/references/request-mocking.md), [storage state](https://github.com/microsoft/playwright-cli/blob/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/skills/playwright-cli/references/storage-state.md).

Take a fresh DOM snapshot before using element references, prefer role/name/test-id locators, confirm the resulting state, inspect console/network errors and capture meaningful screenshots/traces. Reuse existing browser tooling before introducing another driver. Isolate sessions and never commit live cookie/local-storage state.

For Roomline, browser checks should cover keyboard focus, responsive overflow, reduced motion, no results, failed requests, preserved room-creation input, code-entry handoff and real permission/revocation flows where infrastructure exists. Route-mocked tests prove presentation and client behavior only; they do not establish authentication, storage, billing, tenant isolation or access enforcement. Native iOS/Android QA and real-device touch behavior are outside this tool's evidence.

## B11: shadcn/ui

Primary sources: [README](https://github.com/shadcn-ui/ui/blob/e62c9435fff729a175f38983dee73b2cb4f6a069/README.md), [shadcn skill](https://github.com/shadcn-ui/ui/blob/e62c9435fff729a175f38983dee73b2cb4f6a069/skills/shadcn/SKILL.md), [design-system](https://github.com/shadcn-ui/ui/blob/e62c9435fff729a175f38983dee73b2cb4f6a069/skills/shadcn/design-system.md), [Base vs Radix](https://github.com/shadcn-ui/ui/blob/e62c9435fff729a175f38983dee73b2cb4f6a069/skills/shadcn/rules/base-vs-radix.md), [styling](https://github.com/shadcn-ui/ui/blob/e62c9435fff729a175f38983dee73b2cb4f6a069/skills/shadcn/rules/styling.md).

Inspect `components.json` and `components/ui` first. Compose local Radix primitives, use `asChild` correctly to avoid nested interactive elements, include accessible overlay titles, and preserve the customized Button loading prop. Reuse semantic color roles and shared variants rather than restyling each instance independently. A useful specimen page shows states, long content, themes and contrast evidence.

The reviewed upstream docs app uses Next16.4 / React19.2 / Tailwind4.3 and describes newer Base UI/React Aria patterns. Roomline is Next14 / React18 / Tailwind3 with local Radix code and `rsc: false`. Do not apply new-app scaffolds, add-all recipes, Base UI `render`/`nativeButton` APIs, missing Field/Empty/Spinner components, Tailwind4 `@theme` directives or wholesale registry overwrites to this checkout. Review source and dependency diffs for any future component addition.

## Reconciled persistent policy

These sources agree on fundamentals but disagree on many house styles. Do not concatenate their AGENTS/SKILL files. Distill one Roomline policy:

1. **Existing product truth wins.** Preserve access enforcement, routes, data contracts, plan/role behavior and recoverable user work. Design references do not authorize integrations, secret use, external writes, installs or deployment.
2. **Use the installed web stack.** Keep Next14/React18/Tailwind3/Radix APIs until a separately justified migration. Read local primitives and design docs before writing new components.
3. **One shared visual language.** Define semantic surface/text/border/action/status/focus tokens and documented type, spacing, radius and motion roles. Customer-owned room branding remains a distinct domain, not a second hardcoded app palette.
4. **Separate marketing from operation.** Marketing can use stronger composition and imagery. Authenticated rooms and permissions prioritize readable files, clear next actions, stable layouts, familiar controls and restrained motion.
5. **State completeness serves actual components.** Cover applicable default/hover/focus/pressed/selected/disabled/pending/empty/error/success cases; do not invent meaningless states or replace native semantics for a style score.
6. **Accessible by behavior and evidence.** Visible labels/focus, predictable keyboard navigation, readable contrast, non-color-only status, zoom, reduced motion, safe-area handling and recoverable errors are review criteria. Automated checks, screenshot inspection and real-device checks have different scopes; report the scope actually tested.
7. **Motion is functional.** No compulsory scroll choreography in operational UI. Repeated keyboard actions stay immediate. Prefer short explicit-property feedback and test busy/slow environments before performance claims.
8. **Plain, truthful copy.** Use sentence case and named actions; no fake proof, compliance claims, price promises, invented customers or unsupported competitive superiority. Clearly label sample UI.
9. **Persistent documents have distinct jobs.** AGENTS.md: workflow and verification; PRODUCT.md: audience/tasks/product boundaries; DESIGN.md: visual roles, component recipes, responsive behavior and exceptions. Update the relevant document when an accepted decision changes.
10. **Verification is reproducible.** Check critical flows, viewport sizes, long/empty/error data, keyboard and motion modes. Keep file/line evidence and artifacts; a blocked or skipped check is reported as such. Never claim an unrun upstream gate score or use a toolkit self-test as a product-quality score.

### Decisions requiring explicit reconciliation

| Conflict | Roomline decision |
| --- | --- |
| Elaya bans Inter/system fonts; Emil and Impeccable Operate permit them | Choose the documented Roomline UI family for legibility and consistency. A blanket font ban does not override the established system. |
| Elaya mandates gradient headlines; Impeccable rejects them as defaults | No mandatory gradient text. Use the approved hierarchy and measured contrast. |
| Elaya/Taste mandate entrances and scroll moments; Emil discourages frequent/keyboard motion | Operational UI follows frequency-aware restraint. Marketing effects require purpose and reduced-motion behavior. |
| Plugin87 bans native selects; other web guidance favors native affordances | Reuse the local accessible control appropriate to the task. Do not replace a native control solely to satisfy a taste detector. |
| Plugin87 requires oversized display hierarchy; Impeccable Operate recommends compact fixed type | Dense room/table/settings UI uses the compact operational scale; marketing uses a distinct display role. |
| Taste requires a Next static export; Roomline needs server features | Preserve server routing, middleware and APIs. A static marketing artifact may be separate, but the SaaS application is not converted to static export. |
| Vercel Title Case vs other sources' sentence case | Use sentence case consistently in Roomline product copy, preserving proper nouns. |
| New shadcn/Next adapters vs local React18/Tailwind3 components | Actual local source is the API contract; no implicit stack migration. |
| Plugin87 skill demands `accuracy_report`; root AGENTS says it is kit-only | Do not score Roomline with the kit self-test. Run project-targeted checks and report actual evidence. |

No native app, full corpus review, installed toolkit verdict, completed accessibility certification, production access-control proof or launch readiness follows from this reference review.
