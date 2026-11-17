# Real local runtime verification

This harness exercises the application's NextAuth email-code flow against real, isolated PostgreSQL, Redis, SMTP capture, and S3-compatible storage. It does not substitute API responses, authentication, or permission decisions. Use it only with disposable development fixtures.

The recorded broad run passed 17/18 checks and exposed a page-refresh revocation gap. After repair, a separate real guest replay passed 9/9 checks. See [the scoped verification report](../../artifacts/runtime/CORE_LOCAL.md) for exact results and limits; these checks do not visually verify every application screen.

## Start the owned services

The scripts require the installed project dependencies, Node with `--env-file` support, Docker, and the local Docker socket at `/var/run/docker.sock`.

```sh
roomline_runtime_dir=/workspace/scratch/roomline-runtime
node scripts/runtime/services.mjs start --dir "$roomline_runtime_dir"
node --env-file="$roomline_runtime_dir/app.env" node_modules/prisma/build/index.js migrate deploy
node --env-file="$roomline_runtime_dir/app.env" scripts/runtime/service-health.cjs
```

Choose a private directory outside the checkout. The service script generates random credentials, writes mode-600 files in a mode-700 directory, and rejects directories resolving into this repository. Do not source, print, commit, or attach `app.env`, container environment files, captured email, or browser authentication state.

The pinned images run PostgreSQL, Redis, the Serverless Redis HTTP adapter, SeaweedFS's real S3 gateway, and Mailpit. All published ports bind to `127.0.0.1`:

| Service | Host port |
| --- | --- |
| PostgreSQL | 55432 |
| Redis | 56379 |
| Redis HTTP adapter | 58080 |
| S3 | 59000 |
| SMTP capture | 51025 |
| Mailpit HTTP | 58025 |

An occupied port aborts creation of a new service set. Existing owned resources can be reused with the same private directory. Container status alone is not readiness: the health script checks Redis single use and rate limits, authenticated S3 writes/reads, anonymous and wrong-key denials, and the Mailpit API. Services may need a short startup interval before these checks succeed.

## Start the application and exercise the real flows

In one terminal:

```sh
node --env-file="$roomline_runtime_dir/app.env" scripts/runtime/dev-local.mjs
```

The launcher binds the development server to loopback and redacts configured secrets and sensitive query values from its output. Local SMTP delivery is allowed only when the application is in development, `ROOMLINE_LOCAL_INTEGRATION=1`, and the SMTP host is loopback. The normal Redis OTP exchange and NextAuth callback/session remain in use. Local mode also avoids the external onboarding job and hosted IP-deny-list download; Redis request budgets remain enforced.

In a second terminal, set the same directory variable and run:

```sh
roomline_runtime_dir=/workspace/scratch/roomline-runtime
node --env-file="$roomline_runtime_dir/app.env" scripts/runtime/real-integration.cjs
```

The integration script refuses non-loopback services and any database other than the isolated `roomline_runtime` database. It creates unique accounts, teams, a room, a restricted guest link, and a real PDF. Checks cover:

- SMTP-delivered signup codes, the real NextAuth session, and OTP replay denial.
- Free-plan denial, room CRUD, database persistence, and cross-team denial.
- Real PDF upload, MuPDF page rendering, room attachment, and byte-identical storage reads.
- Guest audience denial, email verification, rendered-page access, and download denial/allowance.
- Revoked room, document, page, and download access through the application.

The first compilation can take several minutes; requests allow up to ten minutes without changing access decisions. Results contain sanitized statuses in the private `real-integration-results.json`. A failed or timed-out check remains a failure. The default cleanup removes only that run's test teams, users, and object prefixes. Never reset the database or flush shared Redis to rerun a check.

For focused debugging, `ROOMLINE_KEEP_FIXTURES=1` retains owned fixtures and writes private `owner-auth-state.json` and `integration-fixtures.json`. These files must stay outside the repository. A successful CRUD check still deletes its tested room. Retained fixtures require explicit cleanup by their recorded IDs; removing service data below also removes this disposable database and object store.

`ROOMLINE_RESUME_FIXTURES=1` resumes a retained owner/session/room instead of repeating signup and room creation. Prior successful checkpoints retain their original timestamps in the result; they are not claimed as newly executed checks. For the page-revocation repair alone, use `scripts/runtime/verify-page-revocation.cjs` with the same private environment file. It creates a fresh owned restricted link and verifies real guest access before and after owner revocation.

## Published-version privacy regression

The version-privacy driver uses the retained real owner session, a dedicated `ROOMLINE_REDACTION_TEAM_ID` in the server's explicit feature allowlist, and actual inline PDF processing. Its driver requires the opted-in local fixture environment; the HTTP server can run the real production bundle with local integration disabled. Genuine public guest links avoid relying on development SMTP capture in that production server.

```sh
node --env-file="$roomline_runtime_dir/app.env" scripts/runtime/verify-version-privacy.cjs --phase=verify
```

`verify` (also `all`, and the default) creates an independent synthetic document, renders it, publishes a real redacted derivative, checks historical guest denial and current-primary/authorized-preview behavior, and removes only its own fixtures and object keys. It does not require an earlier vulnerable build. The driver records the served production `__NEXT_DATA__.buildId` and compares it with the local `.next/BUILD_ID`.

The separate `red` and `green` phases preserve the same fixture and genuine guest cookies across a controlled before/after build comparison. `red` intentionally reproduces the historical privacy failure and is labeled **not a release pass**. Run `green` against the rebuilt server before a fresh `verify`; it checks and cleans the retained fixture. Private fixture/authentication files remain outside this repository.

## Limits of this evidence

The paid room plan is an explicit database fixture after verifying free-plan denial. This does not prove Stripe checkout, invoices, or production entitlements. SMTP capture does not prove a production sender domain or deliverability. The local Redis adapter and S3 gateway exercise actual protocol, authentication, persistence, and bytes; they do not certify hosted Upstash, AWS, or Tinybird configuration.

Revocation prevents the application from issuing new page/download access. A previously issued S3 signed URL remains a capability until its expiry, and previously downloaded bytes cannot be withdrawn. The harness does not claim otherwise. Optional Slack/Tinybird configuration is reported unavailable when absent; these checks do not prove provider delivery.

## Stop only this service set

```sh
node scripts/runtime/services.mjs status --dir "$roomline_runtime_dir"
node scripts/runtime/services.mjs stop --dir "$roomline_runtime_dir"
```

`stop` checks the task ownership label before deleting containers and its network. To also remove this disposable set's database/object volumes and private credential/authentication files:

```sh
node scripts/runtime/services.mjs stop --dir "$roomline_runtime_dir" --remove-data
```

No production or external deployment is performed by these scripts. Production deployment still requires an identified project, approved provider configuration, sender setup, billing verification, and runtime evidence for that environment. Native app verification requires an actual native source repository and supported runtime.
