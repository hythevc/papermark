# Roomline product direction

## Audience and promise

Start with founders and small advisory teams preparing fundraising and diligence materials. The initial promise is: **Know what is in the room, how it is shared, and where to look next.** The existing Next.js, React, Tailwind, Prisma, NextAuth, and service integrations remain the application foundation.

The visual direction uses warm white, forest green, charcoal, sage accents, fine borders, and generous spacing. Editorial serif headings belong to marketing; the application retains compact, readable UI typography. No inherited customer endorsements, fake usage numbers, security certifications, or competitor-superiority claims are used.

## Implemented in this release

- Independent brand configuration, SVG identity, metadata, public homepage, responsive navigation, keyboard-operable FAQ, and interactive sample preview.
- Own-host routing, anonymous registration access, safe return paths, host-only session cookies by default, and optional Hanko configuration that fails closed when unavailable.
- Room dashboard with true returned-data summaries, sorting, loading skeletons, retryable errors, and distinct empty/filter states.
- Cards with explicit Shared / Not shared / Frozen states and valid separate navigation links.
- Creation dialog that preserves entered information after request failure and closes only on success.
- Room overview links to documents, sharing, and analytics, with real available counts and existing membership/RBAC gates.
- Critical email identity configuration and own-brand login email/footer.

The preview's document/visit totals are illustrative and clearly labeled. Dashboard summaries derive from visible API results. No ownership/deadline fields, synthetic readiness percentages, or inferred investor intent have been added.

## Next product increments

1. Restore the missing baseline source and verify the complete document-sharing path with real test services.
2. Measure time from room creation to a reviewed first share; improve setup using observed friction.
3. Persist checklist items, owners, and due dates when research establishes how teams actually collaborate.
4. Build an attention queue from real unanswered requests, missing materials, expiring links, and visitor events. Viewing a document alone must not be described as investment intent.
5. Define independent plan entitlements and prices, then configure owned Stripe products and webhook handling. Do not sell plans that the deployment cannot support.

Papermark and other competitors already offer broad document, permission, analytics, Q&A, and AI features. The proposed advantage is a clearer workflow, to be validated through task completion and user research; this release does not establish market superiority. See the [source-backed competitive brief](COMPETITIVE_BRIEF.md).

## Suggested validation measures

Track time to first successful room, first reviewed share, failed-upload recovery, permission-setting comprehension, and the number of steps required to identify a relevant follow-up. Establish a baseline before setting commercial claims or improvement percentages.
