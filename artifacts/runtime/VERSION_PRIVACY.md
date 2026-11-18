# Published-version privacy verification

Verified on 2026-11-17 using the actual local **production build `Fmo26OV53AAGKGw3Dp2Na`**. The served page's `__NEXT_DATA__.buildId` matched `.next/BUILD_ID` in both current-build runs. The original RED run did not capture a public build ID before that earlier production server stopped; none is inferred from a source hash.

The historical RED replay reproduced a concrete failure: after real redaction published a new primary version, a guest with the historical version ID could request fresh URLs for unredacted source bytes. Its eight successful reproduction checks are **not a release pass**.

After the three-route repair, the retained-fixture **GREEN replay passed 5/5**, and an independent fresh-fixture **current-build verification passed 8/8**. These use actual NextAuth owner authentication, genuine public guest sessions, PostgreSQL, private S3-compatible objects, PDF upload, and MuPDF redaction. No route, authorization, database, or storage response was mocked.

| Historical-version request | Prior production RED | Patched retained GREEN | Patched fresh verification |
| --- | --- | --- | --- |
| Document-link initial pages | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |
| Room-link initial pages | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |
| Document-link initial file | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |
| Room-link initial file | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |
| Established document-session page refresh | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |
| Established room-session page refresh | 200; fresh original bytes confirmed | 403; no new file/page URL | 403; no new file/page URL |

Positive controls passed in both current-build runs:

- Current-primary initial page/file requests and page refresh returned byte-identical copies of the real redacted derivative.
- Both original-download endpoints selected the current derivative, even when the request included a historical `documentVersionId` field. These endpoints already selected `isPrimary: true`; no original-download policy change was needed.
- A freshly authorized owner preview could inspect retained historical PDF/page bytes through the existing current-membership/scope guard. A guest submitting that owner token without the actual owner session received 401.
- Historical guest initial denials created no new view rows. The old owner version remained in storage during verification.

The repair requires a current primary for public guest issuance in `POST /api/views`, `POST /api/views-dataroom`, and `POST /api/views/pages`. Later page/file queries also constrain primary state, rather than relying only on the early lookup. History access remains an explicit verified-preview path.

## Repeat the current-build regression

```sh
node --env-file=/workspace/scratch/roomline-runtime/app.env scripts/runtime/verify-version-privacy.cjs --phase=verify
```

`verify` is the default, with `all` as an alias. It creates a new owned fixture, publishes a real redacted copy, verifies the current policy, and cleans its own fixture IDs/object keys. It does not require a vulnerable prior bundle. The private environment must have real loopback services, retained owner authentication, an explicit dedicated redaction-team allowlist, and inline PDF processing. The fixture driver requires development plus explicit local integration mode; the tested HTTP server ran the production bundle with local integration disabled. Public guest links avoid relying on development SMTP capture.

The separate `red`/`green` modes retain one fixture and its genuine guest cookies across an intentional before/after bundle comparison. Both that retained fixture and the independent verification fixture were cleaned successfully. Core owner membership, room and sharing links were untouched; no database reset or shared Redis flush was used.

Evidence: [combined JSON](version-privacy.json), [historical RED](version-privacy-red.json), [retained GREEN](version-privacy-green.json), and [independent verification](version-privacy-verify.json).

This proof uses a synthetic one-page PDF and the stated sharing paths. It does not certify every file format, role/state, production provider, deployment, or comprehensive security. Previously issued storage capabilities retain their TTL: the tested page/original signing path defaults to two minutes and caps requested lifetimes at one hour; other signing paths have separate lifetimes. Previously delivered bytes cannot be withdrawn. Private authentication, object keys, source content and signed URLs remain outside repository artifacts.
