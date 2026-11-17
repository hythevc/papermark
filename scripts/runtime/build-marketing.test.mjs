import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { REQUIRED_HTML, assertStaticOutput, importSpecifiers, localDependency, marketingSources, rewriteAppLinks } from "./build-marketing.mjs";

test("marketing graph traces actual public sources without backend utilities or PWA registration", async () => {
  const sources = await marketingSources("https://roomline-app.example");
  assert.ok(sources.has("components/marketing/product-preview.tsx"));
  assert.ok(sources.has("components/ui/loading-spinner.module.css"));
  assert.ok(!sources.has("components/pwa/pwa-provider.tsx"));
  assert.ok(!sources.has("pages/_app.tsx"));
  assert.match(sources.get("lib/utils.ts"), /return twMerge\(clsx\(inputs\)\)/);
  assert.doesNotMatch(sources.get("lib/utils.ts"), /crypto|fetch|upload|prisma|bcrypt/);
  assert.match(sources.get("components/marketing/marketing-shell.tsx"), /https:\/\/roomline-app\.example\/register/);
  assert.match(sources.get("components/marketing/app-install-guide.tsx"), /BRAND\.appUrl/);
});

test("dependency boundary rejects private local modules, backend packages and dynamic imports", () => {
  for (const specifier of ["@/lib/prisma", "@/context/team-context", "@/components/pwa/pwa-provider", "next-auth/react", "node:crypto"]) {
    assert.throws(() => localDependency("pages/index.tsx", specifier), /rejected/);
  }
  assert.throws(() => importSpecifiers("pages/index.tsx", "const module = import(moduleName);"), /Dynamic module/);
  assert.equal(localDependency("components/ui/button.tsx", "./loading-spinner"), "components/ui/loading-spinner.tsx");
});

test("account actions preserve query/hash on the real app while public marketing links stay local", () => {
  const source = '<Link href="/register?next=%2Fdatarooms#start" /><a href="/guides" /><Link href="/datarooms" />';
  const result = rewriteAppLinks("pages/example.tsx", source, "https://roomline-app.example");
  assert.match(result, /https:\/\/roomline-app\.example\/register\?next=%2Fdatarooms#start/);
  assert.match(result, /href="\/guides"/);
  assert.match(result, /https:\/\/roomline-app\.example\/datarooms/);
});

test("export assertion rejects private routes, workers, customer assets and broken local account links", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roomline-marketing-output-test-"));
  const put = async (file, text) => { await mkdir(path.dirname(path.join(directory, file)), { recursive: true }); await writeFile(path.join(directory, file), text); };
  try {
    for (const file of REQUIRED_HTML) await put(file, "<main>Public Roomline content</main>");
    assert.equal((await assertStaticOutput(directory)).length, REQUIRED_HTML.length);
    for (const file of ["api/ping.json", "datarooms/index.html", "sw.js", "customer-logo.png", "_next/server/auth.js"]) {
      await put(file, "unreviewed");
      await assert.rejects(() => assertStaticOutput(directory));
      await rm(path.join(directory, file));
    }
    await put("index.html", '<a href="/login">Sign in</a>');
    await assert.rejects(() => assertStaticOutput(directory), /application-relative/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
