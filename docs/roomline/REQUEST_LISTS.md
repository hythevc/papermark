# Request lists

Request lists use the existing `TaskList`, `Task`, `TaskAssignment`, `TaskActivity`, and `DocumentUpload` models. The room shows one default list, ordered by `orderIndex` ascending with nulls last, then creation time and ID. Creating a first request creates the default list in a serializable transaction.

## Availability and host workflow

The existing Data Rooms Plus, Premium, and Unlimited entitlement or configured `requestList` team feature flag controls availability. Self-hosted team allowlists can be configured through `ROOMLINE_FEATURE_FLAGS`; this is operator configuration, not proof of a paid subscription. A separate room setting, `requestListEnabled`, controls visitor visibility. Hosts can prepare requests before showing the list to visitors.

The Requests page supports creating, editing, reviewing, reopening, and deleting requests, with due dates, categories, and optional upload destinations. The editor creates email assignments and preserves any existing viewer, group, or link assignments. The API accepts all four assignment target types. One assignment has exactly one target; email addresses are normalized and duplicate targets rejected. A request without assignments is private to the host.

Team API reads require `datarooms.read`; writes require `datarooms.write`. The existing session wrapper verifies active workspace membership and the assigned-room entitlement for scoped members. Every room, task, list, assignee, and upload folder lookup is constrained to the owning room and workspace. Frozen rooms reject request mutations.

Deleting a request removes its assignments and activity. Previously uploaded documents remain in the room, and their upload records lose only the optional task association, following the existing schema's `SetNull` relation.

## Visitor workflow

Visitors need a current, verified sharing session, an actual non-archived view for the same room/link/workspace, and a matching explicit assignment. Viewer IDs and actor IDs are derived from that session. The list response omits assignment targets, other visitors' uploads, and other visitors' comments/activity.

Visitors can add comments, mark work in progress, and submit work for host review. Only the host can complete a request. Completed requests remain readable and can receive comments; frozen rooms are read only. Upload requests automatically become submitted after successful finalization.

TUS creation and resumed transfers verify the current session and current link/task permissions. The browser uses its current app/customer origin so host-only sharing cookies accompany the transfer, and the server resolves the owning team from the link. Passing a task ID always requires that task's assignment, including when generic visitor uploads are enabled. A task can authorize an upload when the link's generic upload switch is off. Archived, deleted, or expired links, frozen rooms, completed requests, missing viewers, and foreign task/folder IDs fail authorization. Storage/configuration initialization failures are explicit errors; they are not successful uploads.

An explicit request folder overrides generic link destinations. Without one, the link's upload-folder allowlist applies, then a validated selected folder or room root. Destinations are validated before document creation and checked again during finalization. Attaching the file, recording its task activity, and submitting the task happen in one serializable transaction after a fresh permission check.

## Current boundaries

No new reminder, assignment-email, or notification automation is provided. Existing generic upload/change notifications retain their existing controls. The current default-list interface does not manage multiple lists or offer a target picker for new group/link/viewer assignments. A conversion or authorization failure after the existing document-processing service creates a document can leave an unattached document; this integration does not introduce background cleanup.

## Verification

As of 17 November 2026, focused tests cover assignment ambiguity and normalization, foreign-target scoping, unchanged assignment retention, session/link binding, revoked and expired links, visitor status restrictions, forced upload destinations, task authorization on generic-upload links, and initial-versus-resumed TUS identity selection. These tests include controlled database doubles. General TUS integration has separately exercised real authenticated transfers and exact stored bytes; this does not by itself establish an assigned-request upload or full request-list browser workflow. Consult [the current runtime evidence](../../artifacts/runtime/README.md) for completed and pending request-specific checks. Hosted Railway verification remains pending deployment approval.

```sh
node --import tsx --test ee/features/request-lists/lib/admin-validation.test.ts ee/features/request-lists/lib/viewer-policy.test.ts ee/features/request-lists/lib/viewer-upload-access.test.ts ee/features/request-lists/lib/tus-metadata.test.ts
```
