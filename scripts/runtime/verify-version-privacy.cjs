#!/usr/bin/env node
/** --phase=verify (or all) creates, verifies and cleans an independent fixture
 * on the current patched build. RED/GREEN retain the same fixture across builds. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { request } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const requestedPhase =
  process.argv.find((value) => value.startsWith("--phase="))?.split("=")[1] ||
  "verify";
const phase = requestedPhase === "all" ? "verify" : requestedPhase;
assert(
  ["red", "green", "verify"].includes(phase),
  "Use --phase=verify, red, green or all.",
);
const runtimeDir =
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime";
const baseURL = process.env.NEXTAUTH_URL;
const loopback = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
// These flags guard the fixture driver; the HTTP server is tested separately
// with NODE_ENV=production and local integration disabled.
assert(
  process.env.NODE_ENV === "development" &&
    process.env.ROOMLINE_LOCAL_INTEGRATION === "1",
  "Use only the opted-in isolated local fixture environment.",
);
assert(
  baseURL &&
    loopback(baseURL) &&
    loopback(database.href) &&
    database.pathname === "/roomline_runtime",
);
assert(loopback(process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || "http://invalid"));
const root = fs.realpathSync(path.resolve(__dirname, "../..")),
  privateDir = fs.realpathSync(runtimeDir);
assert(privateDir !== root && !privateDir.startsWith(root + path.sep));
const retained = JSON.parse(
  fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8"),
);
const stateFile = path.join(runtimeDir, "version-privacy-fixture.json");
const guestStateFile = path.join(
  runtimeDir,
  "version-privacy-guest-state.json",
);
const state =
  phase === "green"
    ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
    : { runId: `version-privacy-${Date.now()}`, sourceKeys: [], linkIds: [] };
if (phase !== "green")
  assert(
    !fs.existsSync(stateFile),
    "A retained privacy fixture already exists; use its green replay.",
  );
const result = {
  checkedAt: new Date().toISOString(),
  phase,
  mode: "real owner NextAuth session, genuine public guest sessions, PostgreSQL/S3 and actual MuPDF redaction; no auth or route mocks",
  checks: [],
  observedStatuses: {},
  limitations: [
    "Only disposable synthetic content is used. Test room/link scaffolding is seeded in the isolated database; upload, redaction and sharing requests are real HTTP calls.",
    "Previously issued storage capabilities remain valid until expiry. The tested getFile path defaults to two minutes and caps requests at one hour; this proof concerns new issuance after primary publication.",
  ],
};
const prisma = new PrismaClient();
const s3 = new S3Client({
  endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
  region: process.env.NEXT_PRIVATE_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.NEXT_PRIVATE_UPLOAD_BUCKET;
let owner, guest;
const save = () => {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.chmodSync(stateFile, 0o600);
};
async function check(name, fn) {
  try {
    await fn();
    result.checks.push({ name, status: "passed" });
    console.log(`${name}: passed`);
  } catch (error) {
    result.checks.push({ name, status: "failed", errorType: error.name });
    throw error;
  }
}
async function json(response, expected = 200) {
  assert.equal(response.status(), expected);
  return response.json();
}
async function bytesFor(url) {
  assert(loopback(url));
  const response = await fetch(url);
  assert(response.ok);
  return Buffer.from(await response.arrayBuffer());
}
async function objectBytes(key) {
  const object = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  return Buffer.from(await object.Body.transformToByteArray());
}
async function pdfText(bytes) {
  const mupdf = await import("mupdf");
  const pdf = new mupdf.PDFDocument(bytes);
  const page = pdf.loadPage(0);
  const text = page.toStructuredText();
  try {
    return text.asText();
  } finally {
    text.destroy();
    page.destroy();
    pdf.destroy();
  }
}
function requestBodies(versionId, hasPages = true) {
  return [
    [
      "document",
      "/api/views",
      {
        linkId: state.documentLinkId,
        documentVersionId: versionId,
        documentName: "privacy.pdf",
        hasPages,
        userId: null,
        ownerId: null,
      },
    ],
    [
      "room",
      "/api/views-dataroom",
      {
        linkId: state.roomLinkId,
        dataroomId: state.roomId,
        linkType: "DATAROOM_LINK",
        viewType: "DOCUMENT_VIEW",
        documentId: state.documentId,
        documentVersionId: versionId,
        documentName: "privacy.pdf",
        hasPages,
        userId: null,
        ownerId: null,
      },
    ],
  ];
}
async function setup() {
  const teamId = process.env.ROOMLINE_REDACTION_TEAM_ID;
  const flags = JSON.parse(process.env.ROOMLINE_FEATURE_FLAGS || "{}");
  assert(
    teamId && flags.redaction?.includes(teamId),
    "Dedicated local redaction allowlist is required.",
  );
  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  state.teamId = teamId;
  state.createdTeam = !existing;
  state.userId = retained.users[0];
  save();
  if (!existing)
    await prisma.team.create({
      data: {
        id: teamId,
        name: state.runId,
        plan: "datarooms-plus",
        users: {
          create: { userId: state.userId, role: "ADMIN", status: "ACTIVE" },
        },
      },
    });
  const member = await prisma.userTeam.findUnique({
    where: { userId_teamId: { userId: state.userId, teamId } },
  });
  assert(member?.status === "ACTIVE" && !member.blockedAt);
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([600, 800]);
  page.drawText("PRIVATE-VERSION-SENTINEL", { x: 50, y: 700, size: 20, font });
  page.drawText("PUBLIC INFORMATION", { x: 50, y: 500, size: 20, font });
  const source = Buffer.from(await pdf.save());
  const key = `${teamId}/doc_${state.runId}/source.pdf`;
  state.sourceKeys.push(key);
  save();
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: source,
      ContentType: "application/pdf",
    }),
  );
  await check(
    "Real PDF upload renders a primary source version containing the synthetic private text",
    async () => {
      const document = await json(
        await owner.post(`/api/teams/${teamId}/documents`, {
          data: {
            name: "privacy.pdf",
            url: key,
            storageType: "S3_PATH",
            type: "pdf",
            contentType: "application/pdf",
            fileSize: source.length,
            numPages: 1,
            createLink: false,
          },
        }),
        201,
      );
      state.documentId = document.id;
      save();
      const version = await prisma.documentVersion.findFirst({
        where: { documentId: document.id, isPrimary: true },
        include: { pages: true },
      });
      assert(version?.hasPages && version.pages.length === 1);
      assert.match(await pdfText(source), /PRIVATE-VERSION-SENTINEL/);
      state.sourceVersionId = version.id;
      save();
    },
  );
  const room = await prisma.dataroom.create({
    data: { pId: `dr_privacy_${Date.now()}`, name: state.runId, teamId },
  });
  state.roomId = room.id;
  save();
  await prisma.dataroomDocument.create({
    data: { dataroomId: room.id, documentId: state.documentId },
  });
  for (const [field, target] of [
    [
      "documentLinkId",
      { documentId: state.documentId, linkType: "DOCUMENT_LINK" },
    ],
    ["roomLinkId", { dataroomId: room.id, linkType: "DATAROOM_LINK" }],
  ]) {
    const link = await prisma.link.create({
      data: {
        teamId,
        ownerId: state.userId,
        ...target,
        allowList: [],
        denyList: [],
        emailProtected: false,
        emailAuthenticated: false,
        allowDownload: true,
        enableNotification: false,
      },
    });
    state[field] = link.id;
    state.linkIds.push(link.id);
    save();
  }
  await check(
    "Actual guest sessions can view the source while it is the current primary",
    async () => {
      state.viewIds = {};
      for (const [name, endpoint, body] of requestBodies(
        state.sourceVersionId,
      )) {
        const data = await json(await guest.post(endpoint, { data: body }));
        assert(!data.isPreview && data.viewId && data.pages?.length === 1);
        assert.equal(
          (await bytesFor(data.pages[0].file)).subarray(0, 8).toString("hex"),
          "89504e470d0a1a0a",
        );
        state.viewIds[name] = data.viewId;
      }
      await guest.storageState({ path: guestStateFile });
      fs.chmodSync(guestStateFile, 0o600);
      save();
    },
  );
  await check(
    "Real redaction publishes a flattened current primary and retains owner history",
    async () => {
      const endpoint = `/api/teams/${teamId}/documents/${state.documentId}/redactions`;
      const job = await json(await owner.post(endpoint, { data: {} }), 201);
      await json(
        await owner.patch(`${endpoint}/${job.id}`, {
          data: {
            action: "add",
            pageNumber: 1,
            x: 50,
            y: 70,
            width: 600,
            height: 90,
          },
        }),
      );
      const applied = await json(
        await owner.post(`${endpoint}/${job.id}`, {
          data: { action: "apply" },
        }),
      );
      const primary = await prisma.documentVersion.findUnique({
        where: { id: applied.versionId },
        include: { pages: true },
      });
      const old = await prisma.documentVersion.findUnique({
        where: { id: state.sourceVersionId },
      });
      assert(
        primary.isPrimary &&
          primary.hasPages &&
          primary.pages.length === 1 &&
          primary.originalFile === primary.file &&
          !old.isPrimary,
      );
      assert.equal(
        await prisma.documentVersion.count({
          where: { documentId: state.documentId, isPrimary: true },
        }),
        1,
      );
      assert.equal((await pdfText(await objectBytes(primary.file))).trim(), "");
      assert.match(
        await pdfText(await objectBytes(old.file)),
        /PRIVATE-VERSION-SENTINEL/,
      );
      state.primaryVersionId = primary.id;
      save();
    },
  );
}
async function replay() {
  const sourceVersion = await prisma.documentVersion.findUnique({
    where: { id: state.sourceVersionId },
    include: { pages: true },
  });
  const primary = await prisma.documentVersion.findUnique({
    where: { id: state.primaryVersionId },
    include: { pages: true },
  });
  assert(!sourceVersion.isPrimary && primary.isPrimary);
  const sourcePage = await objectBytes(sourceVersion.pages[0].file),
    currentPage = await objectBytes(primary.pages[0].file),
    currentPdf = await objectBytes(primary.file);
  const viewsBefore = await prisma.view.count({
    where: { linkId: { in: state.linkIds } },
  });
  await check(
    phase === "red"
      ? "RED proves historical initial page/file requests mint fresh unredacted capabilities"
      : "GREEN denies historical initial page/file requests on both guest sharing routes",
    async () => {
      for (const hasPages of [true, false])
        for (const [name, endpoint, body] of requestBodies(
          state.sourceVersionId,
          hasPages,
        )) {
          const response = await guest.post(endpoint, { data: body });
          result.observedStatuses[
            `${name}-historical-${hasPages ? "pages" : "file"}`
          ] = response.status();
          if (phase === "red") {
            const data = await json(response);
            if (name === "document") state.viewIds.document = data.viewId;
            const bytes = await bytesFor(
              hasPages ? data.pages[0].file : data.file,
            );
            if (hasPages) assert.deepEqual(bytes, sourcePage);
            else assert.match(await pdfText(bytes), /PRIVATE-VERSION-SENTINEL/);
          } else {
            assert.equal(response.status(), 403);
            const data = await response.json();
            assert(!data.file && !data.pages && !data.downloadUrl);
          }
        }
      if (phase === "green")
        assert.equal(
          await prisma.view.count({ where: { linkId: { in: state.linkIds } } }),
          viewsBefore,
        );
    },
  );
  await check(
    phase === "red"
      ? "RED proves established guest page refresh can still mint the historical source"
      : "GREEN denies historical page refresh for established document and room sessions",
    async () => {
      for (const name of ["document", "room"]) {
        const response = await guest.post("/api/views/pages", {
          data: {
            viewId: state.viewIds[name],
            documentVersionId: sourceVersion.id,
            pageNumbers: [1],
          },
        });
        result.observedStatuses[`${name}-historical-refresh`] =
          response.status();
        if (phase === "red") {
          const data = await json(response);
          assert.deepEqual(await bytesFor(data.pages[0].file), sourcePage);
        } else {
          assert.equal(response.status(), 403);
          const data = await response.json();
          assert(!data.pages && !data.file);
        }
      }
    },
  );
  await check(
    "Current-primary initial views, file requests and established page refresh return the actual derivative",
    async () => {
      for (const hasPages of [true, false])
        for (const [, endpoint, body] of requestBodies(primary.id, hasPages)) {
          const data = await json(await guest.post(endpoint, { data: body }));
          assert.deepEqual(
            await bytesFor(hasPages ? data.pages[0].file : data.file),
            hasPages ? currentPage : currentPdf,
          );
        }
      // Document-only sessions rotate their view binding on each initial view.
      const latestDocumentView = await json(
        await guest.post("/api/views", {
          data: requestBodies(primary.id)[0][2],
        }),
      );
      for (const [name, viewId] of [
        ["document", latestDocumentView.viewId],
        ["room", state.viewIds.room],
      ]) {
        const data = await json(
          await guest.post("/api/views/pages", {
            data: { viewId, documentVersionId: primary.id, pageNumbers: [1] },
          }),
        );
        assert.deepEqual(await bytesFor(data.pages[0].file), currentPage);
        if (name === "document") {
          state.latestDocumentViewId = viewId;
          state.viewIds.document = viewId;
        }
      }
      save();
    },
  );
  await check(
    "Original-download issuance selects only the current derivative even with a historical versionId field",
    async () => {
      for (const [endpoint, body] of [
        [
          "/api/links/download",
          {
            linkId: state.documentLinkId,
            viewId: state.latestDocumentViewId,
            documentVersionId: sourceVersion.id,
          },
        ],
        [
          "/api/links/download/dataroom-document",
          {
            linkId: state.roomLinkId,
            documentId: state.documentId,
            documentVersionId: sourceVersion.id,
          },
        ],
      ]) {
        const data = await json(await guest.post(endpoint, { data: body }));
        assert.deepEqual(await bytesFor(data.downloadUrl), currentPdf);
      }
    },
  );
  await check(
    "Freshly authorized owner preview can inspect retained historical file/page bytes",
    async () => {
      for (const [name, endpoint, body] of requestBodies(sourceVersion.id)) {
        const linkId =
          name === "document" ? state.documentLinkId : state.roomLinkId;
        const token = await json(
          await owner.post(`/api/links/${linkId}/preview`),
        );
        const data = await json(
          await owner.post(endpoint, {
            data: {
              ...body,
              userId: state.userId,
              previewToken: token.previewToken,
            },
          }),
        );
        assert(data.isPreview);
        assert.deepEqual(await bytesFor(data.pages[0].file), sourcePage);
        const original = await json(
          await owner.post(endpoint, {
            data: {
              ...body,
              hasPages: false,
              userId: state.userId,
              previewToken: token.previewToken,
            },
          }),
        );
        assert.match(
          await pdfText(await bytesFor(original.file)),
          /PRIVATE-VERSION-SENTINEL/,
        );
        const refreshed = await json(
          await owner.post("/api/views/pages", {
            data: {
              linkId,
              previewToken: token.previewToken,
              documentVersionId: sourceVersion.id,
              pageNumbers: [1],
            },
          }),
        );
        assert.deepEqual(await bytesFor(refreshed.pages[0].file), sourcePage);
        const denied = await guest.post(endpoint, {
          data: {
            ...body,
            previewToken: token.previewToken,
            userId: state.userId,
          },
        });
        assert.equal(denied.status(), 401);
      }
    },
  );
  await guest.storageState({ path: guestStateFile });
  fs.chmodSync(guestStateFile, 0o600);
  save();
}
async function cleanup() {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: state.documentId },
    include: { pages: true },
  });
  const keys = new Set([
    ...state.sourceKeys,
    ...versions
      .flatMap((version) => [
        version.file,
        version.originalFile,
        ...version.pages.map((page) => page.file),
      ])
      .filter(Boolean),
  ]);
  for (const key of keys) {
    assert(key.startsWith(`${state.teamId}/`));
    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
  }
  await prisma.link.deleteMany({ where: { id: { in: state.linkIds } } });
  await prisma.dataroom.deleteMany({
    where: { id: state.roomId, teamId: state.teamId },
  });
  await prisma.document.deleteMany({
    where: { id: state.documentId, teamId: state.teamId },
  });
  if (state.createdTeam)
    await prisma.team.deleteMany({
      where: { id: state.teamId, name: state.runId },
    });
  fs.rmSync(stateFile);
  fs.rmSync(guestStateFile);
  result.cleanup =
    "Only this replay's synthetic fixture IDs and object keys were removed; retained core fixtures were untouched.";
}
(async () => {
  try {
    owner = await request.newContext({
      baseURL,
      timeout: 600000,
      storageState: path.join(runtimeDir, "owner-auth-state.json"),
    });
    guest = await request.newContext({
      baseURL,
      timeout: 600000,
      ...(phase === "green" ? { storageState: guestStateFile } : {}),
    });
    let servedBuildId;
    let buildIdRoute;
    for (const route of ["/", "/404"]) {
      const page = await owner.get(route, { maxRedirects: 0 });
      if (![200, 404].includes(page.status())) continue;
      const embedded = (await page.text()).match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)?.[1];
      if (embedded) { servedBuildId = JSON.parse(embedded).buildId; buildIdRoute = route; break; }
    }
    assert(typeof servedBuildId === "string" && servedBuildId !== "development", "A served Next.js production page must expose its build ID.");
    const bundleBuildId = fs.readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim();
    assert.equal(servedBuildId, bundleBuildId, "The HTTP server must serve the rebuilt production bundle.");
    result.serverBuildId = servedBuildId;
    result.buildIdEvidence = `HTTP ${buildIdRoute} __NEXT_DATA__.buildId matched the local production .next/BUILD_ID.`;
    const session = await json(await owner.get("/api/auth/session"));
    assert.equal(session.user?.id, retained.users[0]);
    if (phase !== "green") await setup();
    await replay();
    result.status =
      phase === "red"
        ? "vulnerability-reproduced-before-activation; not a release pass"
        : "current-primary privacy guard verified";
    if (phase !== "red") await cleanup();
  } catch (error) {
    result.failure = { errorType: error.name };
    process.exitCode = 1;
    console.error(
      `Version privacy ${phase} failed (${error.name}); private fixture retained for targeted diagnosis.`,
    );
  } finally {
    await owner?.dispose();
    await guest?.dispose();
    await prisma.$disconnect();
    s3.destroy();
    fs.writeFileSync(
      path.join(runtimeDir, `version-privacy-${phase}.json`),
      JSON.stringify(result, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `Version privacy ${phase}: ${result.checks.filter((check) => check.status === "passed").length}/${result.checks.length} checks completed; ${result.status || "incomplete"}.`,
    );
  }
})();
