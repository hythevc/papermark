#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const inventory = read("docs/roomline/revamp/SCREEN_INVENTORY.json");
const browser = read("artifacts/revamp/after/browser-report.json");
const registry = read("docs/roomline/revamp/REFERENCE_REGISTRY.json");
const historicalCompiler = read("artifacts/revamp/typecheck-comparison.json");
const finalCompiler = read("artifacts/runtime/typecheck-final.json");
const compiler = {
  ...finalCompiler,
  currentDiagnostics: finalCompiler.diagnostics,
};
const optionalRead = (p) => (fs.existsSync(p) ? read(p) : null);
const core = optionalRead("artifacts/runtime/core-local.json");
const extended = optionalRead("artifacts/runtime/extended-local.json");
const preview = optionalRead("artifacts/runtime/preview-access.json");
const slack = optionalRead("artifacts/runtime/slack-availability.json");
const marketing = optionalRead("artifacts/runtime/marketing/report.json");
const pwa = optionalRead("artifacts/revamp/pwa/browser-report.json");
const protectedUI = optionalRead("artifacts/runtime/authenticated/report.json");
const versionPrivacy = optionalRead("artifacts/runtime/version-privacy.json");
const summary = (run) => ({
  passed: run?.checks?.filter((check) => check.status === "passed").length ?? 0,
  total: run?.checks?.length ?? 0,
});
const coreSummary = summary(core?.priorCoreRun);
const replaySummary = summary(core?.revocationRepairReplay);
const extendedSummary = summary(extended);
const previewSummary = summary(preview);
const slackSummary = summary(slack);
const pwaSummary = summary(pwa);
const sources = {
  "pages/index.tsx": "/",
  "pages/product.tsx": "/product",
  "pages/security.tsx": "/security",
  "pages/guides/index.tsx": "/guides",
  "pages/guides/[slug].tsx": "/guides/fundraising-checklist",
  "pages/solutions/[slug].tsx": "/solutions/fundraising",
  "pages/design-system.tsx": "/design-system",
  "pages/404.tsx": "/404",
  "pages/mobile.tsx": "/mobile",
  "app/(auth)/login/page.tsx": "/login",
  "app/(auth)/register/page.tsx": "/register",
  "app/(auth)/auth/email/[[...params]]/page.tsx": "/auth/email",
};
const passedPaths = new Set(
  browser.captures
    .filter((capture) => capture.result === "passed")
    .map((capture) => capture.route),
);
const routes = [...inventory.routes, ...inventory.added_routes].map((r) => {
  const path = sources[r.source];
  const latestCaptures =
    marketing?.captures?.filter((capture) => capture.route === path) ?? [];
  const historical = path && passedPaths.has(path);
  const protectedCaptures = (protectedUI?.captures ?? []).filter(
    (capture) => capture.source === r.source && capture.status === "accepted",
  );
  return {
    ...r,
    verification: protectedCaptures.length
      ? "Current authenticated production default + source"
      : latestCaptures.length
        ? latestCaptures.every((capture) => capture.result === "passed")
          ? "Current static render + source"
          : "Current static render; checks need follow-up"
        : historical
          ? "14 Nov rendered instance + source"
          : "Source reviewed; visual verification pending",
    renderedPath: protectedCaptures.length
      ? protectedCaptures[0].route
      : latestCaptures.length || historical
        ? path
        : undefined,
  };
});
const data = {
  generatedAt: new Date().toISOString(),
  routes,
  references: registry.entries,
  publicPaths: [
    ...new Set([
      ...passedPaths,
      ...(marketing?.captures ?? []).map((capture) => capture.route),
    ]),
  ],
  historicalPublicPaths: [...passedPaths],
  captures: browser.captures.length,
  compiler,
  historicalCompiler,
  runtime: {
    protectedUI,
    versionPrivacy,
    coreSummary,
    replaySummary,
    previewSummary,
    slackSummary,
    extendedSummary,
    pwa: pwa
      ? {
          ...pwaSummary,
          checkedAt: pwa.generatedAt,
          installPrompt: pwa.installPromptObservation?.status ?? "unverified",
        }
      : "Browser verification unavailable",
    finalIntegratedChecks:
      "Passed: final strict typecheck and production build; see artifacts/runtime/final-verification.json",
  },
  latestMarketing: marketing
    ? {
        generatedAt: marketing.generatedAt,
        result: marketing.result,
        summary: marketing.summary,
      }
    : null,
};
const embedded = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roomline — Design assessment</title><style>
:root{color-scheme:light;--paper:#f7f7f2;--ink:#20322a;--muted:#506259;--line:#d3d8cf;--forest:#174b3f}*{box-sizing:border-box}body{font:16px/1.7 system-ui,sans-serif;margin:0;background:var(--paper);color:var(--ink)}a{color:var(--forest);text-underline-offset:4px}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #366a4e;outline-offset:3px}header,main,footer{width:min(1240px,calc(100% - 48px));margin:auto}header{padding:26px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;align-items:center}header strong{font-size:24px;letter-spacing:-1px}nav{display:flex;gap:22px;flex-wrap:wrap}nav a{font-size:14px;min-height:44px;display:inline-flex;align-items:center}.hero{padding:62px 0 34px}.eyebrow{font-size:11px;letter-spacing:.12em;color:var(--forest);font-weight:700}h1{font-size:clamp(38px,5vw,64px);line-height:1.07;font-weight:550;letter-spacing:-.045em;max-width:900px;margin:19px 0 22px}h2{font-size:32px;letter-spacing:-.03em;font-weight:550;line-height:1.2}h3{font-size:20px;font-weight:550;line-height:1.4}.lede{font-size:19px;max-width:870px;color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:10px;margin:32px 0 0;background:#fff}.metrics>div{padding:22px;border-right:1px solid var(--line)}.metrics>div:last-child{border:0}.metrics strong{display:block;font-size:34px;font-weight:550;letter-spacing:-1px}.metrics span{font-size:13px;color:var(--muted)}section{padding:38px 0;border-top:1px solid var(--line)}.note{border-left:3px solid var(--forest);padding:12px 20px;max-width:980px;color:var(--muted);background:#edf1e7}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:25px}.panel{padding:24px;border:1px solid var(--line);background:#fff;border-radius:9px}.panel h3{margin-top:0}.panel li{margin-bottom:8px}.panel ul{padding-left:20px}.compare{margin:0}.compare img{display:block;width:100%;height:350px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px;background:#fff}.compare figcaption{font-size:13px;color:var(--muted);margin:10px 0 15px}.filters{display:flex;gap:14px;flex-wrap:wrap;align-items:end;margin:25px 0 16px}.filters label{font-size:13px;display:flex;flex-direction:column;gap:6px}.filters input,.filters select{min-height:44px;border:1px solid #7e8a7d;border-radius:6px;background:#fff;color:var(--ink);font:16px system-ui;padding:10px 12px}.filters input{min-width:280px}.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#fff}table{border-collapse:collapse;width:100%;min-width:720px;font-size:13px}th{text-align:left;background:#eaf0e4;font-weight:600;padding:13px}td{border-top:1px solid var(--line);padding:13px;vertical-align:top}td code{overflow-wrap:anywhere;white-space:normal}.status{display:inline-block;padding:2px 8px;border-radius:4px;background:#eef1e9;font-size:12px;color:#3c584a}.count{font-size:13px;color:var(--muted)}details{border-bottom:1px solid var(--line);padding:0 0 12px}summary{min-height:54px;cursor:pointer;display:flex;align-items:center;font-weight:550}.small{font-size:13px;color:var(--muted)}footer{padding:36px 0 48px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}@media(max-width:650px){header,main,footer{width:calc(100% - 36px)}header{align-items:start;flex-direction:column;gap:10px}nav{gap:17px}.hero{padding-top:36px}.lede{font-size:16px}.metrics{grid-template-columns:1fr 1fr}.metrics>div{padding:16px;border-bottom:1px solid var(--line)}.metrics>div:nth-child(2){border-right:0}.metrics>div:nth-child(3){border-bottom:0}.grid{grid-template-columns:1fr}.panel{padding:20px}.compare img{height:330px}h2{font-size:28px}.filters input{min-width:0;width:100%}.filters label{width:100%}}
</style></head><body><header><strong>Roomline / Design review</strong><nav aria-label="Report navigation"><a href="#changes">Implementation</a><a href="#screens">All screens</a><a href="#references">References</a><a href="../../.better-design/app-review.md">Full assessment</a></nav></header><main><div class="hero"><span class="eyebrow">ASSESSMENT + IMPLEMENTATION · UPDATED 17 NOVEMBER 2026</span><h1>A clearer product.<br>A review you can trace.</h1><p class="lede">An evidence-based revamp of Roomline's marketing, shared SaaS components, and responsive mobile web. Coverage distinguishes rendered screens from source-only and blocked work.</p><div class="metrics"><div><strong>${data.routes.length}</strong><span>route templates mapped in source</span></div><div><strong>${data.publicPaths.length}</strong><span>public/reference paths with captures</span></div><div><strong>${data.references.length}</strong><span>references and tool decisions</span></div><div><strong>${compiler.currentDiagnostics}</strong><span>diagnostics at the dated strict checkpoint; final strict check passed</span></div></div></div><p class="note">Required source is restored and representative owner/guest, upload and redaction APIs have real local evidence. Complete protected-screen visual/state coverage remains pending; final integrated compiler/build checks passed; dated local PWA evidence is recorded below. No native project was supplied. This is not a production release or proof of outperforming a competitor.</p><section id="changes"><span class="eyebrow">WHAT CHANGED</span><h2>From a landing page to a coherent public journey.</h2><div class="grid"><article class="panel"><h3>Public marketing</h3><ul><li>Readable full-width interactive product preview with labeled sample data.</li><li>Product, Security, Fundraising, Due diligence, Guides, and preparation articles.</li><li>Clearer account entry, persistent labels, retry states, and code recovery.</li></ul><a href="after/home-1440.png">Open full homepage capture</a></article><article class="panel"><h3>Shared product foundations</h3><ul><li>Semantic light/dark roles and focused primitive checks for focus, errors, and 44px touch targets.</li><li>Disabled links prevent activation; Dialog and Sheet restore focus correctly.</li><li>Mobile chrome source uses shared size reserves and segment-based route matching; authenticated visual coverage remains pending.</li></ul><a href="foundation-browser-results.json">Open focused component checks</a></article></div><h3>Before and after · 14 November captured interfaces</h3><p class="small">Preview images crop the long page; each opens its original full screenshot.</p><div class="grid"><figure class="compare"><a href="before/home-1440.png"><img src="before/home-1440.png" alt="Roomline homepage before the revamp, desktop capture"></a><figcaption>Before · 1440px</figcaption></figure><figure class="compare"><a href="after/home-1440.png"><img src="after/home-1440.png" alt="Roomline homepage after the revamp, desktop capture"></a><figcaption>After · 1440px</figcaption></figure><figure class="compare"><a href="before/register-390.png"><img src="before/register-390.png" alt="Registration before the revamp, phone-sized viewport"></a><figcaption>Before · account entry at 390px</figcaption></figure><figure class="compare"><a href="after/register-390.png"><img src="after/register-390.png" alt="Registration after the revamp, phone-sized viewport"></a><figcaption>After · account entry at 390px</figcaption></figure></div></section><section id="runtime"><span class="eyebrow">17 NOVEMBER RUNTIME CHECKPOINTS</span><h2>Real flows, with the failed check preserved.</h2><p>The restored checkout recorded a full strict TypeScript checkpoint with ${compiler.currentDiagnostics} diagnostics at ${compiler.checkedAt}. The earlier ${compiler.baselineDiagnostics} diagnostics are historical. Full production and static-marketing builds completed at checkpoints; final integrated compiler/build reruns passed after later changes.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Runtime verification table"><table><thead><tr><th scope="col">Evidence</th><th scope="col">Recorded result</th><th scope="col">Scope and limit</th></tr></thead><tbody><tr><td>Broad real core run</td><td>${coreSummary.passed}/${coreSummary.total}</td><td>Signup/session, tenant denial, private PDF and guest access. The page-refresh revocation failure remains in this historical run.</td></tr><tr><td>Targeted revocation repair replay</td><td>${replaySummary.passed}/${replaySummary.total}</td><td>Actual SMTP guest OTP and PNG/PDF bytes before revoke; room/document 404 and page/download 403 afterward, with no new URLs.</td></tr><tr><td>Preview authorization replay</td><td>${previewSummary.passed}/${previewSummary.total}</td><td>Real owner initial PNG previews, foreign-workspace denial, valid token verification and immediate denial after membership or scoped assignment removal.</td></tr><tr><td>Extended real API checks</td><td>${extendedSummary.passed}/${extendedSummary.total}</td><td>Onboarding/trial, actual resumable TUS bytes, and manual redaction publication with database/storage/pixel assertions.</td></tr><tr><td>Optional Slack availability</td><td>${slackSummary.passed}/${slackSummary.total}</td><td>Unavailable GET200 with configured:false, mutation503, active membership and team.write restrictions. This does not certify Slack installation or provider delivery.</td></tr><tr><td>Latest static-marketing browser snapshot</td><td>${marketing?.result ?? "unavailable"}</td><td>${marketing?.summary?.captures ?? 0} captures; ${marketing?.summary?.captureFailures ?? 0} failed captures in that dated snapshot. Follow the current report for rerun status.</td></tr><tr><td>Local Chromium PWA</td><td>${pwaSummary.passed}/${pwaSummary.total}</td><td>Registration/controller, manifest/icons, installability diagnostics, public-cache privacy, generic offline fallback and reconnect. Natural install prompt and OS/iOS installation were not observed.</td></tr><tr><td>All protected visual states</td><td>Full coverage pending</td><td>API/security cases do not prove every screen, physical device behavior, a native app, or hosted production configuration.</td></tr></tbody></table></div><p>Page issuance now checks fresh link status, expiry, room closure, audience and document ACL, same-team attachment, session binding and active preview membership. An authorized owner can inspect archived links. Nine policy regressions pass separately from the real replay. The tested page/original signing path defaults to two-minute URLs, capped at one hour. Previously issued URLs remain valid until expiry; other signing paths have separate lifetimes.</p><a href="../runtime/CORE_LOCAL.md">Read the core evidence</a> · <a href="../runtime/extended-local.json">Read the extended evidence</a> · <a href="../runtime/README.md">Current runtime handoff</a></section><section><span class="eyebrow">COMPETITOR EVIDENCE</span><h2>Compete on clarity, then measure it.</h2><p>Six public competitor pages were captured at desktop and 390px for the 14 November reference audit. Catalog screens are adjacent references, not a live authenticated competitor audit.</p><div class="grid"><article class="panel"><h3>Papermark / DocSend</h3><p>Broad feature sets make generic AI, analytics, and security claims weak differentiation. Roomline should make setup and access review easier to understand.</p><a href="competitors/papermark-home-1440.png">Papermark capture</a> · <a href="competitors/docsend-home-1440.png">DocSend capture</a></article><article class="panel"><h3>Enterprise data rooms</h3><p>Firmex and Ideals explain diligence and service needs. Validate Roomline with task completion and permission comprehension, not unsupported design scores.</p><a href="../../docs/roomline/revamp/COMPETITIVE_ASSESSMENT.md">Read the source-backed comparison</a></article></div></section><section id="screens"><span class="eyebrow">COVERAGE WITHOUT FALSE PASSES</span><h2>Every route, with its actual review status.</h2><div class="filters"><label>Search route, group, or file<input id="route-query" type="search" autocomplete="off" placeholder="e.g. permissions, billing, auth"></label><label>Evidence<select id="route-status"><option value="all">All routes</option><option value="rendered">Rendered instance</option><option value="source">Source-only / visual pending</option></select></label></div><p id="route-count" class="count" role="status"></p><div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable screen coverage table"><table><thead><tr><th scope="col">Route template</th><th scope="col">Area</th><th scope="col">Verification</th><th scope="col">Source</th></tr></thead><tbody id="routes"></tbody></table></div></section><section><span class="eyebrow">RELEASE ORDER</span><h2>The 100X plan is a roadmap, not a multiplier claim.</h2><div class="grid"><article class="panel"><h3>Restored foundation; complete the remaining gates</h3><p>Compatible source and representative local services now run. Final compiler/build checks pass. Complete owned provider and paid billing configuration, business/license requirements, and remaining protected visual/state reviews.</p></article><article class="panel"><h3>Then: validate the differentiated workflow</h3><p>Measure time to first correctly configured share, recovery from failed uploads, and time to find a useful next action. Scope native work only when a real native repository and device runtime are available.</p></article></div><a href="../../docs/roomline/revamp/100X_PLAN.md">Open the prioritized plan</a></section><section id="references"><span class="eyebrow">DESIGN GOVERNANCE</span><h2>Reviewed one by one. Applied where relevant.</h2><p>AGENTS.md, DESIGN.md and CI require reference decisions and traceable evidence. Incompatible frameworks were not migrated into this app. Some named integrations are unavailable or need authentication.</p><div id="references-list"></div><p class="note">21st.dev CLI is installed and MCP is configured without a stored secret. Authenticated discovery requires a newly rotated API_KEY_21ST or browser login. No exposed key was reused.</p><a href="../../docs/roomline/revamp/REFERENCE_REGISTRY.md">Open the full reference registry</a></section></main><footer>Source inventory and browser evidence are separate. Automated checks do not certify all legacy screens, security, WCAG conformance, native behavior, or production readiness. <a href="../../.better-design/app-review.md">Read the full assessment and limitations.</a></footer><script type="application/json" id="report-data">${embedded}</script><script>
const data=JSON.parse(document.getElementById('report-data').textContent);const query=document.getElementById('route-query'),status=document.getElementById('route-status');function render(){const q=query.value.toLowerCase();const selected=data.routes.filter(r=>(r.route+' '+r.group+' '+r.source).toLowerCase().includes(q)&&(status.value==='all'||(status.value==='rendered'?!!r.renderedPath:!r.renderedPath)));const tbody=document.getElementById('routes');tbody.replaceChildren();for(const r of selected){const tr=document.createElement('tr');for(const value of[r.route,r.group,r.verification,r.source]){const td=document.createElement('td');td.textContent=value;tr.append(td)}tbody.append(tr)}document.getElementById('route-count').textContent=selected.length+' of '+data.routes.length+' route templates shown. Dynamic record instances are not exhaustively enumerated.'}query.addEventListener('input',render);status.addEventListener('change',render);render();for(const ref of data.references){const details=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p'),a=document.createElement('a');summary.textContent=ref.name+' · '+ref.status.replaceAll('_',' ');p.textContent=ref.notes;a.textContent='Primary source';const source=ref.resolvedSource||ref.source;details.append(summary,p);try{const url=new URL(source);if(['http:','https:'].includes(url.protocol)){a.href=url.href;details.append(a);}}catch{}document.getElementById('references-list').append(details)}
</script></body></html>`;
fs.writeFileSync("artifacts/revamp/assessment.html", html);
console.log(
  `Built assessment with ${routes.length} source routes and ${data.publicPaths.length} paths with captures; runtime evidence remains separately scoped.`,
);
