# Roomline release status · 18 November 2026

The user approved the reviewed Vercel marketing publication and Railway staging deployment.

| Target | Result | Evidence |
| --- | --- | --- |
| Vercel marketing | **Live and READY** at https://roomline-marketing-hythevc.vercel.app | [Publication and hosted checks](vercel.md) |
| Railway SaaS staging | **Offline; 109 reviewed changes staged** | [Current status](railway.json) |

The marketing publication passed 21 anonymous HTTP checks, 20 desktop/mobile captures and 3 interaction groups. All 48 remote file hashes match the uploaded public bundle. The published pages have no detected Axe violations, overflow or JavaScript errors in those captures. Marketing account links point to the reserved Railway app origin; hosted account creation and login remain pending.

Railway's source connection is staged at reviewed application commit `b59108e0b3fa020916af28bb4133ccee7ec824be`. No Railway deployment was committed. The latest provider read shows all four service records offline with no active deployments. The successful local runtime and CI checks are recorded separately in [runtime evidence](../runtime/README.md); they do not establish hosted SaaS behavior.

The operator can open the [exact Railway staging environment](https://railway.com/project/a3b1c957-33a6-49c3-8d7c-512677ff27dc?environmentId=7713c983-f043-41f7-8fe3-523dcc7e99e9), configure business-owned `RESEND_API_KEY` and a verified `EMAIL_FROM` privately on Roomline, then inspect and apply the existing reviewed 109 changes. Keep credentials out of chat. Do not recreate resources or regenerate the eight staged secrets. After application, verify the deployed commit, health, migrations, private storage/CORS and real owner/guest authentication/upload/revocation flows before treating SaaS staging as verified.

Automatic approval review rejected the Railway apply action despite explicit user approval, reporting **“Cancelled — the user did not approve this action. No changes were made.”** No alternate deployment path was used to bypass that rejection. The empty records and staged configuration prepared before the rejected apply remain in place.
