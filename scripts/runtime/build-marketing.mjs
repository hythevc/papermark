import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile, copyFile, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = path.join(REPO, ".roomline-marketing-output");
export const MARKETING_PAGES = [
  "pages/index.tsx", "pages/product.tsx", "pages/security.tsx",
  "pages/solutions/[slug].tsx", "pages/guides/index.tsx",
  "pages/guides/[slug].tsx", "pages/mobile.tsx", "pages/404.tsx",
];
const SOURCE_ALLOWLIST = new Set([
  ...MARKETING_PAGES,
  "components/marketing/roomline-home.tsx", "components/marketing/product-preview.tsx",
  "components/marketing/marketing-shell.tsx", "components/marketing/roomline-home.module.css",
  "components/marketing/marketing-shell.module.css", "components/marketing/app-install-guide.tsx",
  "components/ui/button.tsx", "components/ui/accordion.tsx",
  "components/ui/loading-spinner.tsx", "components/ui/loading-spinner.module.css",
  "lib/brand.ts", "lib/marketing-content.ts", "lib/utils.ts", "styles/globals.css",
]);
const PACKAGES = new Set([
  "next", "next/app", "next/document", "next/head", "next/link", "next/image",
  "react", "react-dom", "lucide-react", "@radix-ui/react-slot",
  "@radix-ui/react-accordion", "class-variance-authority", "clsx", "tailwind-merge",
]);
const TAILWIND_PACKAGES = new Set([
  "tailwind-scrollbar-hide", "@tailwindcss/forms", "tailwindcss-animate", "@tailwindcss/typography",
]);
const PUBLIC_FILES = [
  "_static/roomline-logo.svg", "_static/roomline-logo-light.svg", "_static/roomline-mark.svg",
  "icons/roomline.svg", "icons/roomline-192.png", "icons/roomline-512.png",
  "icons/roomline-maskable-512.png", "icons/apple-touch-icon.png",
];
const PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_TERMS_URL", "NEXT_PUBLIC_PRIVACY_URL",
  "NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_APP_BASE_HOST", "NEXT_PUBLIC_MARKETING_URL",
];
export const REQUIRED_HTML = [
  "index.html", "product/index.html", "security/index.html",
  "solutions/fundraising/index.html", "solutions/due-diligence/index.html",
  "guides/index.html", "guides/fundraising-checklist/index.html",
  "guides/sharing-checklist/index.html", "mobile/index.html", "404.html",
];
const FRAMEWORK_ERROR_ALIASES = new Set(["404/index.html", "500.html", "500/index.html"]);
const PROTECTED = /^\/(?:login|register|dashboard|auth|datarooms|documents|view)(?:\/|\?|#|$)/;
const PRIVATE_ROUTE_ARTIFACT = /(?:^|\/)(?:api|dashboard|auth|datarooms|documents|login|register|view)(?:\/|\.html$|\.json$)/;

function origin(value, name) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin without credentials or a path.`);
  }
  return url.origin;
}

function parse(file, source) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function replaceRanges(source, changes) {
  for (const { start, end, value } of changes.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, start) + value + source.slice(end);
  }
  return source;
}

/** Preserve marketing navigation; account/workspace actions open the real app. */
export function rewriteAppLinks(file, source, appOrigin) {
  const ast = parse(file, source);
  const changes = [];
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && PROTECTED.test(node.text)) {
      changes.push({ start: node.getStart(ast), end: node.end, value: JSON.stringify(new URL(node.text, appOrigin).href) });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return replaceRanges(source, changes);
}

export function importSpecifiers(file, source) {
  const ast = parse(file, source);
  const imports = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (!ts.isStringLiteral(node.moduleSpecifier)) throw new Error(`Nonliteral module dependency in ${file}`);
      imports.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error(`Dynamic module dependency in ${file}`);
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return imports;
}

export function localDependency(importer, specifier) {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) {
    if (!PACKAGES.has(specifier)) throw new Error(`Marketing dependency rejected: ${specifier} from ${importer}`);
    return null;
  }
  const base = path.posix.normalize(specifier.startsWith("@/") ? specifier.slice(2) : path.posix.join(path.posix.dirname(importer), specifier));
  const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => SOURCE_ALLOWLIST.has(candidate));
  if (!resolved) throw new Error(`Private or unreviewed marketing dependency rejected: ${specifier} from ${importer}`);
  return resolved;
}

function validatePublicSource(file, source) {
  for (const match of source.matchAll(/process\.env\.([A-Za-z0-9_]+)/g)) {
    if (!PUBLIC_ENV.includes(match[1])) throw new Error(`Private/unreviewed environment dependency in ${file}: ${match[1]}`);
  }
  if (/process\s*\[|process\.env\s*\[|serviceWorker|manifest\.webmanifest|\/api\//.test(source)) {
    throw new Error(`Operational service dependency is not allowed in marketing source: ${file}`);
  }
}

async function assertRegularSource(file) {
  const location = path.join(REPO, file);
  if (!(await lstat(location)).isFile()) throw new Error(`Marketing input must be a regular file: ${file}`);
  return readFile(location, "utf8");
}

async function cnModule() {
  const source = await assertRegularSource("lib/utils.ts");
  const ast = parse("lib/utils.ts", source);
  const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "cn");
  if (!declaration?.body || declaration.body.statements.length !== 1 || !/^return\s+twMerge\(clsx\(inputs\)\);?$/.test(declaration.body.statements[0].getText(ast))) {
    throw new Error("The shared cn helper changed; review its pure dependencies before exporting marketing.");
  }
  return `// Exact pure cn implementation extracted from lib/utils.ts; operational utilities are excluded.\nimport { type ClassValue, clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n${declaration.getText(ast)}\n`;
}

const INSTALL_GUIDE = `import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";

/** Marketing opens the app's installation guide; it never registers a worker. */
export function AppInstallGuide() {
  return <div className="space-y-3"><Button asChild size="lg"><a href={new URL("/mobile", BRAND.appUrl).href}>Open Roomline to install</a></Button><p className="max-w-prose text-sm text-muted-foreground">Installation starts from your Roomline app. Open the app, then follow your browser’s installation steps.</p></div>;
}
`;

export async function marketingSources(appOrigin) {
  const generated = new Map([
    ["lib/utils.ts", await cnModule()],
    ["components/marketing/app-install-guide.tsx", INSTALL_GUIDE],
  ]);
  const sources = new Map();
  const pending = [...MARKETING_PAGES, "styles/globals.css"];
  while (pending.length) {
    const file = pending.shift();
    if (sources.has(file)) continue;
    if (!SOURCE_ALLOWLIST.has(file)) throw new Error(`Source outside marketing allowlist: ${file}`);
    let source = generated.get(file) ?? await assertRegularSource(file);
    if (file === "pages/mobile.tsx") {
      const oldImport = 'import { PwaInstallButton } from "@/components/pwa/pwa-install-button";';
      if (!source.includes(oldImport)) throw new Error("Mobile guide dependency changed; review the marketing install boundary.");
      source = source.replace(oldImport, 'import { AppInstallGuide as PwaInstallButton } from "@/components/marketing/app-install-guide";')
        .replace("Use “Install Roomline” above when available.", "On your Roomline app, use “Install Roomline” when available.");
    }
    if (file.endsWith(".css")) {
      if (/@import\b|url\(/i.test(source)) throw new Error(`Review external/imported CSS assets before including ${file}`);
    } else {
      source = rewriteAppLinks(file, source, appOrigin);
      validatePublicSource(file, source);
      for (const specifier of importSpecifiers(file, source)) {
        const dependency = localDependency(file, specifier);
        if (dependency) pending.push(dependency);
      }
    }
    sources.set(file, source);
  }
  for (const file of PUBLIC_FILES) await assertRegularSource(`public/${file}`);
  return sources;
}

async function marketingTailwind() {
  const source = await assertRegularSource("tailwind.config.js");
  for (const specifier of importSpecifiers("tailwind.config.js", source)) {
    if (!TAILWIND_PACKAGES.has(specifier)) throw new Error(`Unreviewed Tailwind plugin: ${specifier}`);
  }
  const ast = parse("tailwind.config.js", source);
  const object = ast.statements.find((node) => ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && node.expression.left.getText(ast) === "module.exports")?.expression.right;
  if (!object || !ts.isObjectLiteralExpression(object)) throw new Error("Review the changed Tailwind configuration before exporting marketing.");
  const changes = [];
  for (const [name, value] of [["content", ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"]], ["safelist", []]]) {
    const property = object.properties.find((node) => ts.isPropertyAssignment(node) && node.name.getText(ast) === name);
    if (!property || !ts.isPropertyAssignment(property)) throw new Error(`Expected Tailwind ${name} configuration.`);
    changes.push({ start: property.initializer.getStart(ast), end: property.initializer.end, value: JSON.stringify(value) });
  }
  return ts.transpileModule(replaceRanges(source, changes), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
}

const APP = `import type { AppProps } from "next/app";
import Head from "next/head";
import { BRAND } from "@/lib/brand";
import "@/styles/globals.css";
export default function MarketingApp({ Component, pageProps }: AppProps) {
  return <><Head><title>{BRAND.name}</title><meta name="description" content={BRAND.description} key="description" /><meta name="theme-color" content="#174b3f" /><link rel="icon" href={BRAND.favicon} /></Head><Component {...pageProps} /></>;
}
`;
const DOCUMENT = `import { Html, Head, Main, NextScript } from "next/document";
export default function MarketingDocument() { return <Html lang="en" className="roomline-marketing"><Head /><body className="roomline-marketing"><Main /><NextScript /></body></Html>; }
`;

async function writeWithin(directory, file, contents) {
  const destination = path.join(directory, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

async function walk(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not permitted in static output: ${relative}`);
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unexpected static artifact: ${relative}`);
  }
  return files;
}

export async function assertStaticOutput(directory) {
  const files = await walk(directory);
  for (const required of REQUIRED_HTML) if (!files.includes(required)) throw new Error(`Missing exported marketing page: ${required}`);
  for (const file of files) {
    if (PRIVATE_ROUTE_ARTIFACT.test(file) || /(?:^|\/)(?:sw\.js|manifest\.webmanifest|offline\.html|\.env[^/]*)$/.test(file)) {
      throw new Error(`Private/application artifact in marketing output: ${file}`);
    }
    if (file.startsWith("_next/") && !/^_next\/(?:static|data)\//.test(file)) throw new Error(`Unexpected Next server artifact: ${file}`);
    if (!file.startsWith("_next/") && !REQUIRED_HTML.includes(file) && !FRAMEWORK_ERROR_ALIASES.has(file) && !PUBLIC_FILES.includes(file) && file !== "roomline-marketing-build.json") {
      throw new Error(`Unreviewed asset in marketing output: ${file}`);
    }
    if (file.endsWith(".html")) {
      if (!REQUIRED_HTML.includes(file) && !FRAMEWORK_ERROR_ALIASES.has(file)) throw new Error(`Unexpected exported route: ${file}`);
      const html = await readFile(path.join(directory, file), "utf8");
      if (/<link\b[^>]*\brel=["']manifest["']|serviceWorker\s*\.\s*register|(?:href|src)=["']\/(?:api|dashboard|auth|datarooms|documents|login|register)(?:\/|["'?])/i.test(html)) {
        throw new Error(`Marketing page retains an application-relative action or worker: ${file}`);
      }
    }
  }
  return files;
}

function buildEnvironment(appOrigin, marketingOrigin) {
  const env = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "SYSTEMROOT", "TZ", "LANG", "LC_ALL"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  for (const key of PUBLIC_ENV) if (process.env[key]) env[key] = process.env[key];
  return { ...env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=4096", NEXT_PUBLIC_BASE_URL: appOrigin, NEXT_PUBLIC_APP_BASE_HOST: new URL(appOrigin).host, NEXT_PUBLIC_MARKETING_URL: marketingOrigin };
}

async function build(directory, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(REPO, "node_modules/next/dist/bin/next"), "build", directory], { cwd: directory, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code, signal) => code === 0 ? resolve() : reject(new Error(`Marketing build failed (${signal ?? code}).`)));
  });
}

export async function buildMarketing({ checkOnly = false, keepWorkspace = false } = {}) {
  const appOrigin = origin(process.env.NEXT_PUBLIC_BASE_URL ?? "https://roomline-staging-3157af3e.up.railway.app", "NEXT_PUBLIC_BASE_URL");
  const marketingOrigin = origin(process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://roomline-marketing-hythevc.vercel.app", "NEXT_PUBLIC_MARKETING_URL");
  if (appOrigin === marketingOrigin) throw new Error("The isolated marketing build requires distinct app and marketing origins.");
  const sources = await marketingSources(appOrigin);
  const tailwind = await marketingTailwind();
  if (checkOnly) { console.log(`Marketing source boundary passed: ${sources.size} traced sources, ${PUBLIC_FILES.length} own assets; no build executed.`); return; }
  if (!(await stat(path.join(REPO, "node_modules/next/dist/bin/next"))).isFile()) throw new Error("Install the repository's locked dependencies before building marketing.");
  const directory = await mkdtemp(path.join(os.tmpdir(), "roomline-marketing-"));
  if (!path.relative(REPO, directory).startsWith("..")) throw new Error("Marketing workspace must be outside the repository.");
  const pending = `${OUTPUT}.pending-${process.pid}`;
  const backup = `${OUTPUT}.previous-${process.pid}`;
  let backedUp = false;
  try {
    for (const [file, source] of sources) await writeWithin(directory, file, source);
    for (const file of PUBLIC_FILES) { await mkdir(path.dirname(path.join(directory, "public", file)), { recursive: true }); await copyFile(path.join(REPO, "public", file), path.join(directory, "public", file)); }
    await writeWithin(directory, "pages/_app.tsx", APP);
    await writeWithin(directory, "pages/_document.tsx", DOCUMENT);
    await writeWithin(directory, "tailwind.config.cjs", tailwind);
    await writeWithin(directory, "postcss.config.cjs", await assertRegularSource("postcss.config.js"));
    await writeWithin(directory, "next.config.mjs", 'export default { output: "export", trailingSlash: true, images: { unoptimized: true }, poweredByHeader: false };\n');
    await writeWithin(directory, ".eslintrc.json", JSON.stringify({ extends: "next/core-web-vitals" }));
    await writeWithin(directory, "tsconfig.json", JSON.stringify({ compilerOptions: { target: "es2020", lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", incremental: true, paths: { "@/*": ["./*"] }, plugins: [{ name: "next" }] }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2));
    const rootPackage = JSON.parse(await readFile(path.join(REPO, "package.json"), "utf8"));
    const declared = { ...rootPackage.dependencies, ...rootPackage.devDependencies };
    const packageNames = [...new Set([...PACKAGES].filter((name) => !name.startsWith("next/"))) , ...TAILWIND_PACKAGES, "tailwindcss", "autoprefixer", "typescript", "@types/node", "@types/react", "@types/react-dom"];
    const dependencies = Object.fromEntries(packageNames.map((name) => { if (!declared[name]) throw new Error(`Missing declared static dependency: ${name}`); return [name, declared[name]]; }));
    await writeWithin(directory, "package.json", JSON.stringify({ name: "roomline-marketing-static", private: true, engines: { node: ">=24" }, dependencies }, null, 2));
    await symlink(path.join(REPO, "node_modules"), path.join(directory, "node_modules"), "dir");
    await build(directory, buildEnvironment(appOrigin, marketingOrigin));
    const exported = path.join(directory, "out");
    const files = await assertStaticOutput(exported);
    await writeWithin(exported, "roomline-marketing-build.json", JSON.stringify({ schemaVersion: 1, builtAt: new Date().toISOString(), applicationOrigin: appOrigin, marketingOrigin, routes: REQUIRED_HTML, sourceFiles: [...sources.keys()].sort(), sourceDigest: createHash("sha256").update([...sources].sort(([a], [b]) => a.localeCompare(b)).map(([name, text]) => `${name}\0${text}`).join("\0")).digest("hex"), assetFiles: PUBLIC_FILES, exportedFiles: files.length, applicationProvidersIncluded: false, serviceWorkerIncluded: false }, null, 2));
    await cp(exported, pending, { recursive: true, errorOnExist: true, force: false });
    try {
      await lstat(OUTPUT);
      const previous = JSON.parse(await readFile(path.join(OUTPUT, "roomline-marketing-build.json"), "utf8"));
      if (previous.schemaVersion !== 1) throw new Error("Refusing to replace an unrecognized marketing output directory.");
      await rename(OUTPUT, backup); backedUp = true;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    await rename(pending, OUTPUT);
    if (backedUp) { await rm(backup, { recursive: true }); backedUp = false; }
    console.log(`Static marketing export verified: ${REQUIRED_HTML.length} HTML routes, ${files.length} files, output ${OUTPUT}`);
  } catch (error) {
    if (backedUp) { await rm(OUTPUT, { recursive: true, force: true }); await rename(backup, OUTPUT); backedUp = false; }
    throw error;
  } finally {
    await rm(pending, { recursive: true, force: true });
    if (!keepWorkspace) await rm(directory, { recursive: true, force: true });
    else console.log(`Retained public-only marketing workspace: ${directory}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => !["--check", "--keep-workspace"].includes(flag))) throw new Error("Usage: build-marketing.mjs [--check] [--keep-workspace]");
  await buildMarketing({ checkOnly: flags.includes("--check"), keepWorkspace: flags.includes("--keep-workspace") });
}
