# Real local core verification

The broad core run passed **17 of 18 checks** on 2026-11-17. Its failed check revealed that `/api/views/pages` could issue new signed page URLs after link revocation. The historical failure remains recorded in [core-local.json](core-local.json); it has not been converted into a full-suite pass.

After repairing the page authorization boundary, an independent, targeted replay passed **9 of 9 real checks**. It reused the retained owner session, created a fresh owned sharing link, completed the guest's actual SMTP-delivered OTP, and read real object-storage bytes. It used no route, authentication, database, permission, or storage mocks.

| Same guest and sharing link | Before revocation | After owner-API revocation |
| --- | --- | --- |
| Room access | Verified guest accepted | 404, no file URLs |
| Document access | Actual rendered page available | 404, no file URLs |
| Page refresh | 200; returned PNG bytes read successfully | 403; no pages or URLs |
| Original download | 200; returned PDF bytes read successfully | 403; no download URL |

The page endpoint now rereads link status, expiry, room closure, document ownership and attachment, audience restrictions, and current document permissions before signing. Document-only views require their existing sharing session. Preview requests require current active membership and any scoped room assignment. An owner can still inspect an archived link through an authorized preview. Page responses use `private, no-store`; internal failures return a generic message. The revoke handler now returns immediately after its 204 response.

Nine focused policy regression tests also pass. These tests use controlled database doubles and cover archive/delete/expiry/freeze, audience changes, attachment and tenant mismatches, removed document ACLs, the verified uploader exception, current group membership, archived owner preview, removed scoped preview assignments, and document-link binding. They are separate evidence from the real HTTP replay.

The final [published-version privacy regression](VERSION_PRIVACY.md) reproduced historical guest access after real redaction, then verified the repair against the actual rebuilt production bundle: **5/5 retained GREEN checks and 8/8 independent current-build checks passed**. All three public version-ID issuance routes now deny non-primary historical guest requests, while current derivative views/downloads and freshly authorized owner-history preview remain valid. The historical RED reproduction is preserved separately and is not a release pass.

The separate [preview authorization replay](preview-access.json) passed **8 of 8 real checks**. A real signed-in owner obtained room/document preview tokens and read actual PNG bytes through both initial-view routes. Foreign-workspace token issuance returned 403; an invalid token plus a caller-supplied `userId` failed on both routes. Blocking/removing the fixture membership, and then removing a temporary scoped-room assignment, denied token issuance and existing initial/page preview access. Original membership was restored and a new owner preview succeeded; temporary links, assignment, and foreign room were removed.

Preview issuance and verification now share a fresh target/membership/read-permission/scope check. Every initial-preview path verifies the token rather than trusting a submitted user ID. This is a targeted repair and replay, not a comprehensive security audit.

```sh
node --import tsx --test lib/api/views/page-access.test.ts
node --env-file=/workspace/scratch/roomline-runtime/app.env scripts/runtime/verify-page-revocation.cjs
node --env-file=/workspace/scratch/roomline-runtime/app.env scripts/runtime/verify-preview-access.cjs
```

The broad run additionally proved real signup/session and OTP replay denial, free-plan room denial, room create/read/update/list persistence, cross-team denial, real private PDF upload and rendering, room attachment, audience denial, verified guest access, and download denial/allowance. Paid-plan access was an explicit isolated database fixture; Stripe checkout was not exercised. The broad run's final room-deletion step was not reached after its failed page check.

The separate [Slack availability replay](slack-availability.json) passed **5 of 5 real API checks**: explicit unavailable GET200, mutation503, active/unblocked membership, team.write restrictions, and unauthenticated/foreign-workspace denial. Four decoder tests keep unavailable, installed, uninstalled and remote failure states distinct. No configured Slack provider delivery was exercised; protected UI recaptures are separate evidence.

Local service health passed 9 of 9 checks against real Redis, authenticated private S3-compatible storage, and SMTP capture. This direct storage check does not prove the resumable TUS transport; extended upload/redaction results are recorded separately.

The tested page/original `getFile` signing path defaults to **two minutes** and caps requested lifetimes at **one hour** in `pages/api/file/s3/get-presigned-get-url.ts`. Other paths, including bulk archive signing, have separate lifetimes. Previously issued signed URLs remain usable until expiry, and previously delivered bytes cannot be withdrawn. This evidence concerns new URL issuance. It does not verify every application screen, production provider configuration, sender deliverability, billing collection, deployment, or a native application. Credentials, OTPs, cookies, authenticated storage state, and signed URLs remain outside the repository.
