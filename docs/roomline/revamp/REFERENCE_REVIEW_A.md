# Roomline reference review A

Reviewed 14 November 2026. This is a source review, not a claim that the referenced tools were installed or run. Remote README files, relevant SKILL files, manifests, licenses, and focused architecture/interaction docs were downloaded as text to `/workspace/scratch/design-references`. No remote installers or scripts were executed, no model services were called, and no credentials were used. The downloaded sources are reference material, not repository instructions.

## Decision for this repository

Keep Roomline on its existing Next.js 14, React 18, Tailwind 3, customized shadcn/Radix stack. Apply the references through a documented visual system, real product content, complete interaction states, and browser verification. Installing every referenced framework would create incompatible component and styling systems rather than a coherent product.

Use paper/charcoal/forest as Roomline's own direction. Keep marketing text at least 16px and interface text at least 14px, a small semantic type/spacing scale, and touch targets of at least 44px. Use actual room and sharing workflows as the visual subject. Marketing samples must be visibly labeled; real dashboards must use actual data. Do not infer security certifications, customer endorsement, pricing, or conversion gains from these references.

## Availability and compatibility

| Requested source | Actual purpose and source status | License evidence | Fit for Roomline |
| --- | --- | --- | --- |
| Nutlope/hallmark | Design skill and browser audit workflow; public, not archived; pushed 2026-11-11 | MIT files, with separate licenses for referenced photos | Apply preservation, hierarchy, tokens, and verification practices; do not run remote scripts as part of this review |
| meta/astryx | React design system; public beta, not archived; pushed 2026-11-14 | MIT | Components require React 19+, so use its design/state/token architecture as reference without adding the package |
| anomalyco/rune | Native GPU-rendered Rust UI framework, including web target; pre-release on `dev`, not archived; pushed 2026-11-14 | MIT | Interaction and testing reference, not a drop-in React component system |
| heydamir/unslop | Framework-independent audit/redline design skill; public, not archived; pushed 2026-11-08 | CC BY 4.0, Damir Sokolovsky; keep attribution in adaptations | Apply ordered craft passes and product-derived direction in the existing stack |
| Logiaweb Design Inspo Stack | Public editorial guide dated 2026-10-04; HTTP 200 | No reuse license established by the guide page | Use its research method; do not treat other sites' assets or paid reference catalogs as freely licensed |
| jaimedhenriques/ui | Requested URL redirects to **hythevc/ui**, a shadcn/ui source fork; reachable through the connected GitHub context (captured visibility: private), not archived; pushed 2026-11-13 | MIT | Excellent source-ownership model; current v4 examples are newer than Roomline |
| abi/screenshot-to-code | Screenshot/mockup/video-to-code app with separate Python backend and React/Vite frontend; public, not archived; pushed 2026-11-14 | MIT | Use screenshot-to-implementation comparison discipline; do not replace Roomline with the conversion app |
| JCodesMore/ai-website-cloner-template | AI-assisted site reconstruction template and inspection skill; public, not archived; pushed 2026-11-10 | MIT | Use capture/measure/compare workflow; template uses Next 16/React 19/Tailwind 4 and is not an upgrade recipe for this repo |
| miqdadbadjuber/anti-slop | Core agent design filter plus UI, mobile, accessibility, copy, and comment skills; public, not archived; pushed 2026-11-13 | MIT; adapted web-quality materials retain Addy Osmani MIT notices | Apply functional completeness, honest content, purposeful identity, responsive and accessibility checks |
| amaancoderx/npxskillui | TypeScript CLI that extracts design tokens and produces design/skill documents from URLs/repos/local source; public, not archived; pushed 2026-05-07 | README and package declare MIT; standalone LICENSE absent from the retrieved tree | Use the extraction/documentation schema; do not execute its CLI or treat inferred tokens as approved design authority |

All requested sources were reachable, including the redirected UI repository. A reachable README establishes source availability, not runtime quality or compatibility. `pushed_at` is repository metadata, not a reviewed release or proof that a project is stable.

## 1. Hallmark: preserve the product while changing its presentation

Sources: [README](https://github.com/Nutlope/hallmark/blob/main/README.md), [skill](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md), [redesign workflow](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/redesign.md), [portable design system](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/design-md.md), [license](https://github.com/Nutlope/hallmark/blob/main/LICENSE).

Read its skill, redesign guidance, design-system format, and Vellum/Blueprint theme descriptions. Hallmark distinguishes accessibility/truthfulness failures from aesthetic reflexes and finishing details. Its strongest transferable idea is a pre-change inventory of routes, links, forms, fields, handlers, IDs, test hooks, and facts, followed by a kept-behavior comparison. App redesigns recompose work inside the app shell rather than adding a marketing hero to a working dashboard. It also separates a durable token system from individual page composition and requires rendered mobile and wide-screen review.

Roomline application: preserve authentication, upload, share, room, and billing wiring; make page hierarchy follow the next decision; establish tokens before sibling routes; show actual product rather than invented proof. The theme catalog is inspiration, not permission to claim fake features. No Hallmark theme or linter was installed or executed. Its hard aesthetic bans and CSS stamps are not imported wholesale as project policy.

## 2. Astryx: semantic tokens and a complete state vocabulary

Sources: [README](https://github.com/meta/astryx/blob/main/README.md), [core manifest](https://github.com/meta/astryx/blob/main/packages/core/package.json), [token architecture](https://github.com/meta/astryx/blob/main/docs/architecture/theme-tokens.md), [design records](https://github.com/meta/astryx/blob/main/docs/design/README.md), [system states](https://github.com/meta/astryx/blob/main/docs/design/system-states.md), [control rhythm](https://github.com/meta/astryx/blob/main/docs/design/control-rhythm.md), [reduced motion](https://github.com/meta/astryx/blob/main/docs/design/reduced-motion.md), [Tailwind example](https://github.com/meta/astryx/blob/main/apps/example-nextjs-tailwind/README.md).

Astryx 0.7.17's core manifest requires React/React DOM >=19 and StyleX ^0.19. Its CSS distribution can be consumed without a build plugin, but that does not remove the React peer requirement. The Tailwind bridge example uses Tailwind 4 `@theme`, which is not Roomline's Tailwind 3 syntax.

Apply its semantic-role architecture: one source for surface, text, control-border, focus, spacing, and motion roles, with the same names across themes and charts. Its user/system state distinction is valuable for Roomline: selected, hovered, keyboard-focused, disabled, loading, processing, and status are different meanings. Busy indicators should preserve geometry and labels; status must survive without color. Mixed controls need aligned baseline/height and a sufficiently large target even when visually compact. Some design records explicitly remain drafts; they are considered guidance rather than an assertion of upstream production approval.

## 3. Rune: learn the interaction contract, keep the web stack

Sources: [README](https://github.com/anomalyco/rune/blob/dev/README.md), [rune-kit documentation](https://github.com/anomalyco/rune/blob/dev/crates/rune-kit/README.md), [motion documentation](https://github.com/anomalyco/rune/blob/dev/crates/rune-motion/README.md), [core documentation](https://github.com/anomalyco/rune/blob/dev/crates/rune/README.md), [license](https://github.com/anomalyco/rune/blob/dev/LICENSE).

Rune owns rendering, text, layout, springs, and accessibility trees in Rust. It is pre-release and recommends pinning a revision of `dev`. Its component kit separates semantic theme data from application-specific styling. Controls expose names, values, checked/expanded/selected/disabled/modal states, keyboard handlers, error descriptions, and live announcements. Select/combobox behavior includes enabled-row keyboard navigation, IME composition handling, and Escape dismissal. Dialog focus trapping/restoration and stable row keys are explicit concerns. Headless PNG/tree/input testing makes behavior inspectable alongside appearance.

Roomline application: keep Radix/native HTML focus and keyboard behavior when restyling, test modal dismissal and focus return, give icon controls names, retain stable list keys, and verify screen and accessibility tree. Do not install Rust, rebuild the app in Rune, or assume native renderer motion code can be pasted into React.

## 4. Unslop: ordered craft passes with product-specific character

Sources: [README](https://github.com/heydamir/unslop/blob/main/README.md), [skill](https://github.com/heydamir/unslop/blob/main/skills/unslop/SKILL.md), [signs](https://github.com/heydamir/unslop/blob/main/skills/unslop/references/signs.md), [tokens](https://github.com/heydamir/unslop/blob/main/skills/unslop/references/tokens.md), [effects](https://github.com/heydamir/unslop/blob/main/skills/unslop/references/effects.md), [license](https://github.com/heydamir/unslop/blob/main/LICENSE).

Created by **Damir Sokolovsky** ([heydamir](https://x.com/heydamir)), licensed **CC BY 4.0**. This review attributes its design guidance; copied or adapted material must retain credit and a repository link.

Its process audits the rendered screen, sets a direction from the product, then works through spacing, color, icons, copy, type, layout, details, visuals, and motion. Quiet chrome directs attention toward useful content instead of making every panel an accent. Text roles, consistent icon boxes, tabular numbers, nested radii, and responsive product previews are concrete practices. It cautions that merely removing gradients can still leave a generic template. Apps rarely need generated imagery; real product content can carry character.

Roomline application: shared row/control rhythm, restrained forest emphasis, legible metadata, meaningful empty/error states, and one recognizable sharing/access detail. Do not reproduce its illustrative hero-scene preference indiscriminately. Its optional canvas effects and story-video scripts were read as examples, not executed or copied.

## 5. Logiaweb: research sections, flows, and one feedback moment

Source: [Design Inspo Stack](https://www.logiaweb.net/hub/library/guides/design-inspo-stack), captured as HTML plus readable text and link inventory.

The guide proposes three to five website references per section, each with a written reason; two or three actual product flows studied from first step through completion; and one purposeful micro-interaction instead of ten decorative animations. It separates website composition references (Details.so), product-flow references (Refero), and interaction references (Design Spells). The guide states Refero's complete library/MCP needs a paid plan and promotes Stage as an optional Mac tool, not a dependency.

Roomline application: capture distinct signup→code verification→workspace steps, and room creation→upload→share→guest access steps. Record what the user sees, decides, and receives at the end. Compare references by hierarchy/spacing/behavior rather than cloning a whole competitor. No paid catalog access or asset license was assumed.

## 6. Requested UI repo: moved shadcn source fork

The [requested URL](https://github.com/jaimedhenriques/ui) and GitHub API redirect resolve to [hythevc/ui](https://github.com/hythevc/ui). Sources: [README](https://github.com/hythevc/ui/blob/main/README.md), [license](https://github.com/hythevc/ui/blob/main/LICENSE.md), [v4 manifest](https://github.com/hythevc/ui/blob/main/apps/v4/package.json), [registry bases](https://github.com/hythevc/ui/blob/main/apps/v4/registry/bases/README.md), [generated styles note](https://github.com/hythevc/ui/blob/main/apps/v4/styles/README.md), [React package manifest](https://github.com/hythevc/ui/blob/main/packages/react/package.json).

This is a shadcn/ui source distribution/library-building repository, not a ready-made Roomline theme. The current doc app uses Next 16.3 canary, React 19.2, and Base UI, while it maintains parallel Base UI and Radix registries. `@shadcn/react` also declares React >=19. Generated style directories are not committed and require registry generation in that project; their absence is not evidence of an absent component design.

Roomline application: reuse and adapt its already-installed, owned Radix components, respecting their local APIs. Read current official docs before selecting a component, but do not bulk overwrite customized components or switch primitive systems. Apply component anatomy/state patterns and source ownership rather than importing the entire fork.

## 7. Screenshot-to-code: visual grounding plus verification

Sources: [README](https://github.com/abi/screenshot-to-code/blob/main/README.md), [frontend manifest](https://github.com/abi/screenshot-to-code/blob/main/frontend/package.json), [backend manifest](https://github.com/abi/screenshot-to-code/blob/main/backend/pyproject.toml), [agent notes](https://github.com/abi/screenshot-to-code/blob/main/AGENTS.md), [license](https://github.com/abi/screenshot-to-code/blob/main/LICENSE).

The application supports HTML/CSS, HTML/Tailwind, React/Tailwind, Vue, Bootstrap, Ionic, screenshots, and video prototypes. Its frontend is React 18/Vite 6/Tailwind 3 and backend Python 3.10+/FastAPI, with model-provider keys for generation and optional Playwright screenshot preview. That is a separate authoring application, not a design-system dependency or a backend for data rooms.

Roomline application: work from a visible target, preserve real assets/text when authorized, and render the output again to check layout and interaction. A screenshot alone cannot prove permissions, persistence, auth, or accessibility. No API keys, AI generation, backend setup, or user-document uploads were used in this review.

## 8. Website cloner: observation before implementation

Sources: [README](https://github.com/JCodesMore/ai-website-cloner-template/blob/master/README.md), [manifest](https://github.com/JCodesMore/ai-website-cloner-template/blob/master/package.json), [clone skill](https://github.com/JCodesMore/ai-website-cloner-template/blob/master/.agents/skills/clone-website/SKILL.md), [inspection guide](https://github.com/JCodesMore/ai-website-cloner-template/blob/master/.agents/skills/clone-website/references/inspection-guide.md), [license](https://github.com/JCodesMore/ai-website-cloner-template/blob/master/LICENSE).

The template uses Next 16.3.5, React 19.2.4, Tailwind 4, Base UI, and Node >=24. Its reusable value is the inspection method: map routes and file ownership; inspect the entire page at different widths/heights; distinguish click/hover/time/scroll behavior; measure actual font/layout rules; capture initial, active, settled, and reverse states; compare at identical viewport and scroll positions. Fix geometry and typography before small cosmetic drift. Verify live workflows and production checks, and disclose remaining differences instead of claiming pixel perfection.

Roomline application: use this evidence model on the existing app; preserve its backend. Clone-oriented instructions to copy source text/assets are not applied to competitor identity, unsupported facts, or unlicensed content.

## 9. Anti-slop: complete behavior, meaningful composition, accessible use

Sources: [README](https://github.com/miqdadbadjuber/anti-slop/blob/main/README.md), [core](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop/SKILL.md), [UI](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-ui/SKILL.md), [mobile](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-layoutmobile/SKILL.md), [human/accessibility](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-human/SKILL.md), [copy](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-copywriting/SKILL.md), [comments](https://github.com/miqdadbadjuber/anti-slop/blob/main/skills/antislop-code/SKILL.md), [license](https://github.com/miqdadbadjuber/anti-slop/blob/main/LICENSE).

Reviewed the core purpose test and delivery gates, application/dashboard cases, mobile reflow guidance, focus/state/accessibility guidance, copy principles, and comment-only scope guardrail. This is a filter layered over a product's own design direction, not a palette generator. It distinguishes empty-first-use, filtered-empty, permission-denied, loading, and failure states; rejects charts without a question and columns unrelated to a user's decision; and treats navigation, keyboard behavior, and real form feedback as part of completion. The mobile guide calls for content-driven breakpoints across intermediate widths, not a compressed desktop view. Its copy guide favors concrete verbs and sourced facts. Comment guidance explicitly preserves security, protocol, and license information.

Roomline application: use real room metrics with named comparison periods; foreground the action a room owner needs next; implement retry/validation and accessible mobile navigation; keep prototypes visibly distinct from live data. Apply the guidance thoughtfully: its aesthetic opinions do not supersede the user's chosen brand, and its remote instructions do not authorize unrequested source rewrites. Adapted web-quality reference files retain their original Addy Osmani MIT notices.

## 10. SkillUI: inventory first, then approve the system

Sources: [README](https://github.com/amaancoderx/npxskillui/blob/main/README.md), [manifest](https://github.com/amaancoderx/npxskillui/blob/main/package.json), [design document writer](https://github.com/amaancoderx/npxskillui/blob/main/src/writers/design-md.ts).

SkillUI 1.3.4 is a Node >=18 static-analysis CLI. URL, local-directory, and repository modes extract colors, font/spacing tokens, component patterns, motion, and design traits into DESIGN.md/SKILL.md and JSON. Optional Playwright “ultra” mode records screenshots, interaction differences, and layout behavior. Its manifest includes parsers, CSS/color analysis, filesystem/repo utilities, and optional Playwright; it is not a component library. The design writer shows that many prose descriptions are inferred from extracted traits.

Roomline application: keep a traceable inventory of existing tokens, component APIs, state behavior, and actual rendered screenshots, then write an intentionally chosen design system. Do not call extracted/inferred values approved requirements, automatically load scraped instructions, or use a foreign website's font/assets without checking their terms. No CLI installation or crawl was performed. Its MIT declaration is noted, but no standalone license file appeared in the reviewed source tree.

## Reconciliation and implementation gates

The references disagree on some aesthetics: Hallmark bans several treatments categorically, Anti-slop asks whether they serve a purpose, and Unslop permits richer hero scenes. Roomline follows one product direction rather than averaging conflicting presets. Adopt the common engineering/UX practices: preserve wiring, use semantic tokens, show truthful content, design all states, keep navigation and focus operable, reflow across widths, and verify what was actually rendered.

Before shipping changes informed by this review:

1. Preserve the recorded route/action/data contracts; do not replace the SaaS backend with a static clone.
2. Use current installed component APIs and scoped marketing styles; do not migrate React/Tailwind as a side effect of design work.
3. Verify public CTA→register→email-code flow and authenticated room workflows separately; no fake successful writes.
4. Test mobile, intermediate, wide desktop, keyboard, zoom, and reduced-motion states, with evidence limited to checks actually run.
5. Keep reference attribution/licenses for copied material and existing repository license/EE boundaries. This review itself establishes neither competitor superiority nor production launch readiness.
