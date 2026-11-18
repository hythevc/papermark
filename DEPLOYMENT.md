# Roomline deployment

Updated on 2026-11-18 after the user's explicit deployment approval. Marketing is live at **https://roomline-marketing-hythevc.vercel.app** on Vercel. The complete authenticated Next.js application is prepared for Railway staging, but its reviewed 109 changes have not been applied. See [hosted marketing evidence](./artifacts/deployment/vercel.md) and [Railway status](./artifacts/deployment/railway.json). Provider billing configuration and product claims still require the business owner's configuration and verification.

## Account and source

Railway's two connected account links resolve to the same `jaimedhenriques` identity and the same personal workspace, `583803ef-4c0e-4a91-be6e-0b55d4cdc2f1`. Use **Jaime Main Account**, link `link_6ade7c2777e4819197cc2e18712da28b`. The 17 accessible projects contain no Roomline/Papermark project. Discovery read project names, not unrelated services, variables, credentials, or mail providers.

The root implementation agent created the new private **Roomline** project and its **staging** environment: project `a3b1c957-33a6-49c3-8d7c-512677ff27dc`, environment `7713c983-f043-41f7-8fe3-523dcc7e99e9`. [Open the exact staging environment](https://railway.com/project/a3b1c957-33a6-49c3-8d7c-512677ff27dc?environmentId=7713c983-f043-41f7-8fe3-523dcc7e99e9). Do not attach to another project. Every operation below uses these exact IDs and the returned service IDs.

### Staged implementation status

Patch `fa27cd5a-5822-41b3-b0e9-e9c7ede4f401` now has **109 reviewed changes**, `STAGED`, and no destructive resource changes. These include the dedicated infrastructure, eight independent shared secrets, public-origin bindings and the exact application source connection pinned to `b59108e0b3fa020916af28bb4133ccee7ec824be`. Source is staged, not live connected. The reserved app origin is `https://roomline-staging-3157af3e.up.railway.app`. The latest provider status shows all four services offline with no active deployments; an absence of reported issues does not mean they are running.

The user explicitly approved this reviewed deployment on 2026-11-18. The subsequent Railway apply attempt was nevertheless rejected by automatic approval review: **“Cancelled — the user did not approve this action. No changes were made.”** No Railway deployment was committed. The operator can apply the reviewed pending changes from the exact staging dashboard above; another approval message is not needed. Do not bypass the rejected tool action through an immediate source connection, configuration update, CLI upload, or alternate deployment path. No rollback is needed for the canceled apply action.

| Created resource      | Actual ID                              | State                                        |
| --------------------- | -------------------------------------- | -------------------------------------------- |
| Postgres service      | `c6632d8c-bf9f-4bd8-9962-9ac4b42db722` | Empty record; image/config pending           |
| Redis service         | `b1267dd2-3b39-4b99-8ac1-44f886e2d158` | Empty record; image/config pending           |
| RedisREST service     | `8d5e380d-cbf7-43bd-bebc-7721cb89dfa4` | Empty record; image/config pending           |
| Roomline service      | `c765d930-419c-4e64-8369-c7184ee789e1` | Pinned source/config staged; no deployment   |
| Postgres 1 GiB volume | `5ac86e45-a522-43a3-95f5-b5c0687febe8` | Staged creation                              |
| Redis 1 GiB volume    | `43dc4e38-dda9-4e97-86a0-87af2197c484` | Staged creation                              |
| Files bucket (`sjc`)  | `fee26cb6-2596-4426-9515-ddd60515c6cc` | Staged creation                              |

`NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_BASE_HOST`, and `NEXT_PUBLIC_MARKETING_URL` are staged with the actual reserved origins. Marketing is published on Vercel. No provider plan/permission limit blocked Railway staging; automatic approval review blocked applying it. Railway provisioning, migrations, native S3/CORS and runtime behavior remain unverified until the pending changes are applied and exercised. Business-owned `RESEND_API_KEY` and verified `EMAIL_FROM` are still absent from the app's configured variable names.

The reviewed runtime source has a successful full production build and strict TypeScript check. GitHub Actions application and design-evidence jobs passed at `b32645260991add2b5cc214436e83e201f2f75ef`. The selected source branch is `codex/roomline-saas` in `hythevc/papermark`; the pending Railway connection pins the already-published application commit `b59108e0b3fa020916af28bb4133ccee7ec824be`. Subsequent commits change reporting and CI bootstrap ordering, not runtime application source. The connector does not upload the local working tree.

## Topology

| Resource    | Configuration                                                                                           | Network and persistence                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Roomline`  | Full Next.js app; Node 24; one replica; initial ceiling 2 GB RAM / 2 vCPU                               | The only public application domain; stateless filesystem                              |
| `Postgres`  | The PostgreSQL 16 image digest exercised locally; initial ceiling 512 MB / 0.5 vCPU                     | Private DNS only; persistent 1 GB volume at `/var/lib/postgresql/data`                |
| `Redis`     | The Redis 7 image digest exercised locally; AOF enabled; no eviction; initial ceiling 256 MB / 0.5 vCPU | Private DNS only; persistent 1 GB volume at `/data`                                   |
| `RedisREST` | The tested `hiett/serverless-redis-http` digest; env mode; authenticated; port 8080; IPv6 enabled       | Private DNS only; no public domain; Redis remains the real backing store              |
| `Files`     | One native Railway private S3-compatible bucket                                                         | Private objects accessed by signed capabilities; S3 endpoint is on the public network |

Use the defaults `us-west2` for compute and `sjc` for the bucket unless a different staging location is deliberately chosen before creation. Bucket region is immutable. These choices are not a data-residency promise. New Railway environments support IPv4 and IPv6 private DNS. `SRH_IPV6=true` also supports the IPv6 path.

The exact image digests and proposed connector arguments are in [railway-staging-plan.json](./railway-staging-plan.json). These are the images recorded by the owned local integration harness. Current template discovery instead returns PostgreSQL 18 and Redis 8.2; silently taking those defaults would change the tested database versions. The PostgreSQL template also returned `isVerified=false`; the Redis template returned `isVerified=true`. No template's README establishes this application's production readiness.

## Reference variables and secrets

Railway service references have the form `${{ServiceName.VARIABLE}}`; environment-wide references use `${{shared.VARIABLE}}`. Bucket connection references are:

```text
NEXT_PRIVATE_UPLOAD_BUCKET=${{Files.BUCKET}}
NEXT_PRIVATE_ARCHIVE_BUCKET=${{Files.BUCKET}}
NEXT_PRIVATE_UPLOAD_ENDPOINT=${{Files.ENDPOINT}}
NEXT_PRIVATE_UPLOAD_REGION=${{Files.REGION}}
NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID=${{Files.ACCESS_KEY_ID}}
NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY=${{Files.SECRET_ACCESS_KEY}}
```

`BUCKET` is the real S3 name, not the bucket's display name. New Railway buckets use virtual-host addressing, which matches the default AWS SDK behavior. Uploads and existing freeze ZIPs use different object prefixes; using one bucket avoids assuming that one bucket's scoped credential can access a second bucket. Freeze/other background workflows remain unavailable until their separate worker configuration and endpoint paths are verified.

Map both Prisma runtime and direct URLs to `${{Postgres.DATABASE_URL}}`. `POSTGRES_PRISMA_SHADOW_URL` points to a distinct reserved `roomline_staging_shadow` database name; `prisma migrate deploy` does not need to connect to a shadow database. Do not run `migrate dev` against staging, and never point a shadow URL at the real staging database.

Map both Redis REST URL variables to `http://${{RedisREST.RAILWAY_PRIVATE_DOMAIN}}:8080` and their token variables to the newly generated shared bridge token. `SRH_CONNECTION_STRING=${{Redis.REDIS_URL}}`. This adapter supplies the existing Upstash REST protocol, including real Redis session, single-use-code, rate-limit, and lock behavior. It does not fabricate authentication/cache success.

Generate independent cryptographically random values for the shared names listed in the JSON. Use 32 random bytes represented as 64 hexadecimal characters for each purpose. Keep values out of this checkout, output, attachments, build logs, and chat. Pass them directly from a private execution result to `set_variables`, and report only returned variable names. Do not use any unrelated project's values.

Railway documents `${{secret(64, "abcdef0123456789")}}` as a **template-deployment function**. The PostgreSQL/Redis templates generate their passwords this way. Its execution by ordinary `set_variables` is not documented, so this plan does not rely on that behavior. A literal unresolved function expression is not a production secret.

The root agent has reserved and staged the actual app-origin literals: `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL` are `https://roomline-staging-3157af3e.up.railway.app`, and `NEXT_PUBLIC_APP_BASE_HOST` is `roomline-staging-3157af3e.up.railway.app`. The staged marketing origin is `https://roomline-marketing-hythevc.vercel.app`. All `NEXT_PUBLIC_*` values are build-time configuration. Session cookies remain host-only. Do not set local capture flags or copied localhost URLs. These bindings are pending deployment configuration, not proof that the domains serve a running application.

The root agent also staged `ROOMLINE_PROCESSING_MODE=inline`. This enables the real bounded PDF path on the full Railway service without requiring a Trigger.dev worker. It does not provide Office/Keynote conversion endpoints, video processing, production email, or other background-service bindings.

## Storage CORS

Native Railway buckets support the standard S3 `PutBucketCors` operation; official documentation includes an `aws s3api put-bucket-cors` example. A private bucket's authentication requirement alone does not grant browser CORS access.

The proposed policy allows anonymous cross-origin **GET/HEAD** with `AllowedOrigins: ["*"]`, `AllowedHeaders: ["*"]`, and exposes `ETag`, `Content-Length`, `Content-Range`, and `Accept-Ranges`. This permits browser PDF/image reads with signed URLs. It does not make objects public or send cross-site cookies. TUS uploads are same-origin and server-to-S3, so they do not require a browser PUT policy. Add an origin-limited PUT/POST rule only if a separately verified direct browser-upload feature needs it.

[configure-storage-cors.mjs](./scripts/deploy/configure-storage-cors.mjs) is a one-time, idempotent setup helper for the new staging bucket. It requires explicit staging/project/bucket opt-in guards and uses the service's injected reference credentials. It was prepared without executing a storage operation. The pre-deploy command runs it after migrations; remove the opt-in after a successful first setup if subsequent deploys should not write bucket CORS.

## Prepared configuration and remaining execution

1. **Completed:** Create the empty service records and stage source images, dedicated secrets, variables, resource ceilings, database volumes and native bucket. The reviewed patch is scoped to this exact project/environment; connector values were redacted.
2. **Prepared:** Reserve the app domain and stage its public URLs, storage references and CORS project/bucket guards. Node 24, `npm run build`, `npm run start -- --hostname 0.0.0.0 --port $PORT`, pre-deploy `npx prisma migrate deploy && node scripts/deploy/configure-storage-cors.mjs`, `/api/health`, restart on failure, one replica and no sleep are already staged.
3. **Owner binding pending:** Configure business-owned `RESEND_API_KEY` and verified `EMAIL_FROM` privately on Roomline. No public database, Redis, bridge domain or TCP proxy is required.
4. The user approved the deployment, and the published application commit `b59108e0b3fa020916af28bb4133ccee7ec824be` is already pinned with `staged:true`. The combined patch remains unapplied after automatic approval review rejected the apply action. The operator can inspect and apply these existing 109 changes in the staging dashboard. Do not restage secrets, duplicate resources or connect an unpinned branch.
5. After application, confirm Postgres, persistent Redis and the private authenticated Redis REST bridge are healthy. Verify the actual hosted build/deploy, then HTTP health, protected-page redirects, registration error handling, private storage denial, authenticated signed-object access with CORS, migrations, session/rate-limit behavior, and the real authenticated owner/guest upload/revocation flow. Provider success or local tests do not establish hosted behavior.

Railway pre-deploy commands can access service variables and the private network. A failure stops deployment, with no automatic retry. They run in a separate container without volume mounts. Migrations therefore run there; Postgres/Redis data initialization happens in their own persistent services.

## Isolated Vercel marketing artifact

The static marketing build does not change the full application's Next.js configuration or export its authenticated routes. It creates a separate temporary workspace outside this repository and traces only the curated public pages, marketing components, Button/Accordion/spinner, public brand/content helpers, semantic styles, and eight owned Roomline assets. Only the existing pure `cn` function is extracted from the otherwise operational `lib/utils.ts` module. Unreviewed local/package imports and private environment dependencies fail the source check.

```sh
node scripts/runtime/build-marketing.mjs --check
node --test scripts/runtime/build-marketing.test.mjs
node scripts/runtime/build-marketing.mjs
```

The isolated production build completed with exit code 0: **10 HTML pages and 47 exported files**. The source-boundary check and four focused tests also passed. This exact public artifact was published on 2026-11-18 as Vercel deployment `dpl_EaLxmeV1ykTFsmkxdfyokLQ4FEjg`, status **READY**, at **https://roomline-marketing-hythevc.vercel.app**. All 48 provider files match their uploaded SHA1s: 47 export files plus static routing configuration. The default public origins are the Railway app origin and Vercel marketing origin recorded above; explicit `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_MARKETING_URL` values must remain distinct HTTPS origins.

Fresh local static-browser verification is recorded under `artifacts/runtime/marketing/` by `scripts/runtime/marketing-browser.cjs`. The rebuilt artifact passed **20 of 20 route/viewport captures and all three interaction groups**, with zero automated Axe WCAG A/AA violations, overflow, unexpected console/page errors, private/foreign requests, authenticated cookies, or PWA registration. Account CTAs resolve to the actual Railway app origin and were inspected without navigating there. Manual image inspection covered the first-view layout, mobile navigation, long content, and corrected installation CTA.

The first local run found insufficient contrast on the mobile installation page's shared Button anchors. Narrowing the anchor reset's specificity lets component text-color tokens apply; the new artifact's complete browser rerun verifies the fix. `initial-report.json` and the `before-contrast-fix` screenshots preserve the initial finding. The subsequent [hosted Vercel verification](./artifacts/deployment/vercel.md) passed **21/21 anonymous HTTP checks, 20/20 desktop/mobile captures and 3/3 interaction groups**, with zero detected Axe violations, layout overflow, uncaught JavaScript errors or unexpected console/private/external requests. Browser captures do not establish physical-device installation or complete accessibility conformance. Account CTA destinations were checked without navigating to the unapplied Railway app.

The generated app/document contain no session/team/backend providers, manifest, or service-worker registration. Account/workspace CTAs open the Railway app. The marketing `/mobile` guide directs installation to the app's own origin, where the actual PWA belongs. No customer assets, API routes, secrets, or operational pages are copied. The copied Tailwind configuration preserves the existing semantic design tokens while limiting content scanning to the public workspace and removing the unused Tremor safelist.

After a successful Next.js static export and output assertions, the script promotes only the static files to the gitignored `.roomline-marketing-output` directory. A failed build preserves the previous recognized artifact. The artifact includes a public-only source digest/route manifest. The approved publication uploaded this public export to team `team_pe74HMcqhmeKmVMl8AGbuX2F`, project `prj_mgNOiawu88be97jPdsPDXRcqYnFM`. Vercel Authentication was disabled only on that public marketing project. The repository was not connected for automatic future deployments, and no continuous error-monitoring integration was configured.

## Required owner binding and optional services

The production email binding is not supplied: configure this business's `RESEND_API_KEY` and a verified, owned `EMAIL_FROM`. Optional category/reply-to values are listed in `.env.example`. No matching Roomline project exists from which to reuse a sender, and unrelated company credentials must not be borrowed. The staging website can build without a mail provider; email registration/login cannot complete until this binding is real. Local Mailpit capture is restricted to development and cannot substitute for hosted delivery.

Free, Trial, and Hobby plans block outbound SMTP. The existing HTTPS Resend integration works with that restriction; a Pro upgrade solely to use SMTP is unnecessary. Optional Google/LinkedIn/Hanko/SSO, analytics/Tinybird, Slack, AI, remote conversion workers, marketing mail, and background notifications need their own owned configuration before their workflows are enabled. No keys, sender identity, legal address, support email, certification, price, or production entitlement is invented here.

The inherited Stripe catalog currently describes EUR prices and legacy/current account IDs. It has not been checked against an owned live Stripe account. Configure owned products/prices, webhook signatures, portal, checkout, cancellation, and payment/idempotency tests separately. A paid-plan test fixture is not proof of a payment or business entitlement.

## Costs and limits

The current connector profile/workspace tools do not expose the account's paid plan, usage, credit balance, or remaining budget. Existing project count does not prove the plan. These are public documented rates, not an account-specific quotation:

| Item                    | Documented rate/limit                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Hobby                   | $5/month minimum, including the first $5 of resource usage                                                         |
| Pro                     | $20/month minimum, including the first $20 of usage                                                                |
| Container memory        | $10 per GB-month of actual usage                                                                                   |
| Container CPU           | $20 per vCPU-month of actual usage                                                                                 |
| Service egress          | $0.05/GB, including service-to-bucket uploads                                                                      |
| Persistent volumes      | $0.15/GB-month                                                                                                     |
| Native bucket storage   | $0.015/GB-month; S3 operations and bucket egress are free                                                          |
| Hobby documented maxima | 6 replicas; up to 48 GB RAM / 48 vCPU including replica multiplication; 5 GB volume; 1 TB combined bucket capacity |

Service builds are currently free. A four-service always-on application is not promised to fit the $5 credit. For illustration, **actual** continuous aggregate RAM use of 2.875 GB would cost $28.75/month before CPU, volumes, storage, or service egress; configured ceilings are not measured use. The hard usage limit can stop services and suspend bucket reads/uploads, so budget and alert settings must be reviewed for the new project. This plan never changes account plan or spending limits.

## Official references and discovery evidence

- [Variables and reference syntax](https://docs.railway.com/variables/reference.md)
- [Template-only secret generation](https://docs.railway.com/templates/create.md)
- [Private networking](https://docs.railway.com/networking/private-networking/how-it-works.md)
- [Buckets, connection references, URL style, and supported operations](https://docs.railway.com/storage-buckets.md)
- [Bucket CORS and signed URLs](https://docs.railway.com/storage-buckets/uploading-serving.md)
- [Bucket pricing and limits](https://docs.railway.com/storage-buckets/billing.md)
- [Plans and resource prices](https://docs.railway.com/pricing/plans.md)
- [Outbound email restrictions](https://docs.railway.com/networking/outbound-networking.md)
- [Pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command.md)
- [Redis HTTP adapter configuration](https://github.com/hiett/serverless-redis-http#environment-variables)

Official public markdown was read because Railway's `fetch_docs` connector returned `pageFound:false` for its own search URLs. The unmodified reference text is saved outside the checkout under `/workspace/scratch/railway-roomline-plan`. Workspace/project discovery and template descriptions used read-only Railway tools. Subsequently authorized mutations were confined to the exact new staging project/environment and the pending resources above. No deployment was applied and no email was sent by the staging-plan agent.

## Exact reviewed application source

The deployment plan selects `b59108e0b3fa020916af28bb4133ccee7ec824be`. Subsequent commits record this pin, evidence and CI bootstrap ordering; application-source digest `c08f061269bcf11b74eb26e1296860aacb4be23bf6a051d71a28218a9453d11c` is unchanged. The user approved this commit and the Vercel/Railway plan. Marketing is published and hosted-verified. Railway source/configuration remains staged and its infrastructure has not been applied.
