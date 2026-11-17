#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { request } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const { PDFDocument } = require("pdf-lib");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const runtimeDir =
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime";
const baseURL = process.env.NEXTAUTH_URL;
const mailURL = process.env.ROOMLINE_MAILPIT_URL || "http://127.0.0.1:58025";
const loopback = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
if (
  process.env.NODE_ENV !== "development" ||
  process.env.ROOMLINE_LOCAL_INTEGRATION !== "1" ||
  !baseURL ||
  !loopback(baseURL) ||
  !loopback(mailURL)
)
  throw new Error(
    "This harness requires explicit local development integration mode and loopback services.",
  );
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
if (!loopback(database.href) || database.pathname !== "/roomline_runtime")
  throw new Error(
    "Refusing writes outside the isolated roomline_runtime database.",
  );
fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
const repoRoot = fs.realpathSync(path.resolve(__dirname, "../.."));
const realRuntimeDir = fs.realpathSync(runtimeDir);
if (
  realRuntimeDir === repoRoot ||
  realRuntimeDir.startsWith(repoRoot + path.sep)
)
  throw new Error("Keep auth state and runtime files outside the checkout.");
fs.chmodSync(runtimeDir, 0o700);
if (!loopback(process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || "http://invalid"))
  throw new Error("Object storage must use loopback.");
const s3 = new S3Client({
  endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
  region: process.env.NEXT_PRIVATE_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.NEXT_PRIVATE_UPLOAD_BUCKET;

const prisma = new PrismaClient();
const resumeData = process.env.ROOMLINE_RESUME_FIXTURES === "1"
  ? JSON.parse(fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8")) : null;
if (resumeData && !/^roomline-\d+$/.test(resumeData.runId)) throw new Error("Invalid retained fixture run.");
const runId = resumeData?.runId || `roomline-${Date.now()}`;
const result = {
  runId,
  checkedAt: new Date().toISOString(),
  mode: "real local services; no auth/permission mocks",
  checks: [],
  limitations: [
    "Paid plan is an explicit isolated database fixture after verifying free-plan denial; Stripe billing was not exercised.",
    "SMTP capture verifies local delivery, not a production sender domain or delivery provider.",
    "Local Redis REST proxy and S3 gateway are real isolated services; hosted Upstash/AWS/Tinybird behavior is not certified.",
    "Revocation checks deny new app-issued page/download access. Previously issued object-storage signed URLs remain capabilities until their expiry; this harness does not claim instant invalidation of previously delivered bytes.",
  ],
};
const contexts = [];
const fixtures = { users: [], teams: [], rooms: [], links: [] };
if (resumeData) {
  for (const key of Object.keys(fixtures)) {
    assert(Array.isArray(resumeData[key]) && resumeData[key].every(id => typeof id === "string"));
    fixtures[key] = resumeData[key];
  }
  const previous = JSON.parse(fs.readFileSync(path.join(runtimeDir, "real-integration-results.json"), "utf8"));
  assert.equal(previous.runId, runId);
  result.checks = previous.checks.filter(check => check.status === "passed").map(check => ({ ...check, checkpointFrom: check.checkpointFrom || previous.checkedAt }));
}
let ownerForReview;
async function checked(name, fn) {
  result.checks = result.checks.filter(check => check.name !== name);
  try {
    const value = await fn();
    result.checks.push({ name, status: "passed" });
    console.log(`${name}: passed`);
    return value;
  } catch (error) {
    result.checks.push({ name, status: "failed", errorType: error.name });
    console.error(`${name}: failed (${error.name})`);
    throw error;
  }
}
async function ctx(options = {}) {
  const context = await request.newContext({ baseURL, timeout: 600000, ...options });
  contexts.push(context);
  return context;
}
async function json(response, expected, operation) {
  assert.equal(
    response.status(),
    expected,
    `${operation} expected HTTP ${expected}, received ${response.status()}`,
  );
  return response.json();
}
async function mailCode(email, pattern) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(`${mailURL}/api/v1/messages`);
    assert(response.ok);
    const data = await response.json();
    const message = data.messages.find((item) =>
      item.To?.some((to) => to.Address?.toLowerCase() === email),
    );
    if (message) {
      const body = await (
        await fetch(`${mailURL}/api/v1/message/${message.ID}`)
      ).json();
      const code = String(body.Text || body.HTML || "").match(pattern)?.[0];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("LocalCaptureDeliveryTimeout");
}
async function signUp(label) {
  const context = await ctx();
  const email = `${label}-${runId}@roomline.test`;
  const csrf = await json(await context.get("/api/auth/csrf"), 200, "CSRF");
  assert(csrf.csrfToken);
  await json(
    await context.post("/api/auth/signin/email", {
      form: {
        csrfToken: csrf.csrfToken,
        email,
        callbackUrl: `${baseURL}/dashboard`,
        json: "true",
      },
    }),
    200,
    "Email signin",
  );
  const code = await mailCode(email, /\b[A-Z0-9]{10}\b/);
  const verify = await json(
    await context.post("/api/auth/verify-code", { data: { email, code } }),
    200,
    "OTP exchange",
  );
  assert(
    verify.callbackUrl &&
      new URL(verify.callbackUrl).origin === new URL(baseURL).origin,
  );
  const callback = await context.get(verify.callbackUrl, { maxRedirects: 0 });
  assert(
    [302, 303].includes(callback.status()),
    "NextAuth callback must redirect after successful token use.",
  );
  const session = await json(
    await context.get("/api/auth/session"),
    200,
    "Session",
  );
  assert.equal(session.user?.email, email);
  assert(session.user?.id);
  fixtures.users.push(session.user.id);
  const replay = await context.post("/api/auth/verify-code", {
    data: { email, code },
  });
  assert.equal(replay.status(), 401, "OTP replay must fail.");
  const teams = await json(
    await context.get("/api/teams"),
    200,
    "Default team",
  );
  assert(Array.isArray(teams) && teams.length === 1);
  fixtures.teams.push(teams[0].id);
  return { context, email, userId: session.user.id, team: teams[0] };
}

(async () => {
  try {
    const anonymous = await ctx();
    let owner, endpoint, room;
    if (resumeData) {
      owner = await checked("Retained real NextAuth session resumes only its owned fixture room", async () => {
        const context = await ctx({ storageState: path.join(runtimeDir, "owner-auth-state.json") });
        const session = await json(await context.get("/api/auth/session"), 200, "Retained session");
        assert.equal(session.user?.id, fixtures.users[0]);
        const team = await prisma.team.findFirst({ where: { id: fixtures.teams[0], users: { some: { userId: session.user.id } } } });
        assert(team);
        return { context, email: session.user.email, userId: session.user.id, team };
      });
      ownerForReview = owner;
      endpoint = `/api/teams/${owner.team.id}/datarooms`;
      room = await prisma.dataroom.findFirst({ where: { id: fixtures.rooms[0], teamId: owner.team.id, name: { startsWith: runId } } });
      assert(room, "Retained owned room is required to resume.");
    } else {
    await checked("Unauthenticated room API denies access", async () => {
      const r = await anonymous.get(
        "/api/teams/isolated-nonexistent/datarooms",
      );
      assert.equal(r.status(), 401);
    });
    owner = await checked(
      "Real signup, SMTP OTP, NextAuth callback/session and replay denial",
      () => signUp("owner"),
    );
    ownerForReview = owner;
    endpoint = `/api/teams/${owner.team.id}/datarooms`;
    await checked("Real free-plan room creation is denied", async () => {
      const r = await owner.context.post(endpoint, { data: { name: runId } });
      assert.equal(r.status(), 403);
    });
    await checked(
      "Create explicit paid-plan fixture in isolated database",
      () =>
        prisma.team.update({
          where: { id: owner.team.id },
          data: {
            plan: "datarooms",
            limits: { datarooms: 5, users: 5, links: 50, documents: 50 },
          },
        }),
    );
    room = await checked(
      "Room create writes actual database record",
      async () => {
        const data = await json(
          await owner.context.post(endpoint, { data: { name: runId } }),
          201,
          "Room create",
        );
        const room = data.dataroom;
        assert(room?.id);
        fixtures.rooms.push(room.id);
        assert.equal(
          (await prisma.dataroom.findUnique({ where: { id: room.id } })).name,
          runId,
        );
        return room;
      },
    );
    await checked("Room read/update/list preserve database state", async () => {
      const detail = `${endpoint}/${room.id}`;
      await json(await owner.context.get(detail), 200, "Room read");
      await json(
        await owner.context.patch(detail, {
          data: { name: `${runId}-updated` },
        }),
        200,
        "Room update",
      );
      assert.equal(
        (await prisma.dataroom.findUnique({ where: { id: room.id } })).name,
        `${runId}-updated`,
      );
      const data = await json(
        await owner.context.get(`${endpoint}?simple=true`),
        200,
        "Room list",
      );
      assert(data.datarooms.some((r) => r.id === room.id));
    });
    const outsider = await checked("Independent real second user/session", () =>
      signUp("outsider"),
    );
    await checked("Cross-team room read/update/create denied", async () => {
      for (const response of [
        await outsider.context.get(`${endpoint}/${room.id}`),
        await outsider.context.patch(`${endpoint}/${room.id}`, {
          data: { name: "must-not-write" },
        }),
        await outsider.context.post(endpoint, {
          data: { name: "must-not-create" },
        }),
      ])
        assert([401, 403, 404].includes(response.status()));
      assert.equal(
        (await prisma.dataroom.findUnique({ where: { id: room.id } })).name,
        `${runId}-updated`,
      );
    });
    }
    const pdfFixture = await checked(
      "Real private PDF upload, persisted document, rendered page and room attachment",
      async () => {
        let document = resumeData ? await prisma.document.findFirst({ where: { teamId: owner.team.id, name: "fixture.pdf", type: "pdf" } }) : null;
        let bytes;
        if (document) {
          const stored = await s3.send(new GetObjectCommand({ Bucket, Key: document.file }));
          bytes = Buffer.from(await stored.Body.transformToByteArray());
          assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
        } else {
        const pdf = await PDFDocument.create();
        pdf
          .addPage([300, 400])
          .drawText("Roomline isolated integration fixture", {
            x: 20,
            y: 300,
            size: 11,
          });
        bytes = Buffer.from(await pdf.save());
        const key = `${owner.team.id}/doc_${Date.now()}/fixture.pdf`;
        await s3.send(
          new PutObjectCommand({
            Bucket,
            Key: key,
            Body: bytes,
            ContentType: "application/pdf",
          }),
        );
        document = await json(
          await owner.context.post(`/api/teams/${owner.team.id}/documents`, {
            data: {
              name: "fixture.pdf",
              url: key,
              storageType: "S3_PATH",
              type: "pdf",
              contentType: "application/pdf",
              fileSize: bytes.length,
              numPages: 1,
              createLink: false,
            },
          }),
          201,
          "Document upload",
        );
        }
        assert(document.id);
        const version = await prisma.documentVersion.findFirst({
          where: { documentId: document.id, isPrimary: true },
          include: { pages: true },
        });
        assert(
          version &&
            version.hasPages &&
            version.numPages === 1 &&
            version.pages.length === 1,
        );
        const page = version.pages[0];
        assert(page.file.startsWith(`${owner.team.id}/`));
        const rendered = await s3.send(
          new GetObjectCommand({ Bucket, Key: page.file }),
        );
        const pageBytes = Buffer.from(
          await rendered.Body.transformToByteArray(),
        );
        assert.equal(
          pageBytes.subarray(0, 8).toString("hex"),
          "89504e470d0a1a0a",
        );
        const attachment = await prisma.dataroomDocument.findUnique({ where: { dataroomId_documentId: { dataroomId: room.id, documentId: document.id } } });
        if (!attachment) await json(
          await owner.context.post(`${endpoint}/${room.id}/documents`, { data: { documentId: document.id } }),
          201, "Room document attachment",
        );
        assert(
          await prisma.dataroomDocument.findUnique({
            where: {
              dataroomId_documentId: {
                dataroomId: room.id,
                documentId: document.id,
              },
            },
          }),
        );
        return { document, version, bytes, pageBytes };
      },
    );
    const allowedEmail = `guest-${runId}@roomline.test`;
    const link = await checked(
      "Create real restricted, email-verified guest link",
      async () => {
        const data = await json(
          await owner.context.post("/api/links", {
            data: {
              teamId: owner.team.id,
              targetId: room.id,
              linkType: "DATAROOM_LINK",
              name: "Local integration only",
              audienceType: "GENERAL",
              emailProtected: true,
              emailAuthenticated: true,
              allowList: [allowedEmail],
              denyList: [],
              allowDownload: false,
              enableNotification: false,
            },
          }),
          200,
          "Link create",
        );
        assert(data.id);
        fixtures.links.push(data.id);
        return data;
      },
    );
    const guestBody = {
      linkId: link.id,
      dataroomId: room.id,
      linkType: "DATAROOM_LINK",
      viewType: "DATAROOM_VIEW",
      userId: null,
      ownerId: null,
    };
    await checked(
      "Guest outside audience denied without view creation",
      async () => {
        const before = await prisma.view.count({ where: { linkId: link.id } });
        const r = await anonymous.post("/api/views-dataroom", {
          data: { ...guestBody, email: `denied-${runId}@roomline.test` },
        });
        assert.equal(r.status(), 403);
        assert.equal(
          await prisma.view.count({ where: { linkId: link.id } }),
          before,
        );
      },
    );
    const guest = await ctx();
    await checked(
      "Allowed guest must complete real email verification",
      async () => {
        const data = await json(
          await guest.post("/api/views-dataroom", {
            data: { ...guestBody, email: allowedEmail },
          }),
          200,
          "Guest code request",
        );
        assert.equal(data.type, "email-verification");
        const code = await mailCode(allowedEmail, /\b\d{6}\b/);
        const verified = await json(
          await guest.post("/api/views-dataroom", {
            data: { ...guestBody, email: allowedEmail, code },
          }),
          200,
          "Guest verification",
        );
        assert(verified.viewId);
        const view = await prisma.view.findUnique({
          where: { id: verified.viewId },
        });
        assert(view && view.verified && view.viewerEmail === allowedEmail);
        await json(
          await guest.post("/api/views-dataroom", {
            data: { ...guestBody, email: allowedEmail },
          }),
          200,
          "Guest persisted access",
        );
      },
    );
    const documentBody = {
      ...guestBody,
      documentId: pdfFixture.document.id,
      documentVersionId: pdfFixture.version.id,
      documentName: "fixture.pdf",
      hasPages: true,
      viewType: "DOCUMENT_VIEW",
      email: allowedEmail,
    };
    await checked(
      "Audience denial also prevents document bytes and download issuance",
      async () => {
        const r = await anonymous.post("/api/views-dataroom", {
          data: { ...documentBody, email: `denied-${runId}@roomline.test` },
        });
        assert.equal(r.status(), 403);
        const body = await r.json();
        assert(!body.file && !body.pages);
        const download = await anonymous.post(
          "/api/links/download/dataroom-document",
          { data: { linkId: link.id, documentId: pdfFixture.document.id } },
        );
        assert([401, 403, 404].includes(download.status()));
      },
    );
    const documentView = await checked(
      "Verified guest receives real rendered page bytes while downloads stay denied",
      async () => {
        const data = await json(
          await guest.post("/api/views-dataroom", { data: documentBody }),
          200,
          "Guest document view",
        );
        assert(data.viewId && data.pages?.length === 1 && data.pages[0].file);
        assert(loopback(data.pages[0].file));
        const response = await fetch(data.pages[0].file);
        assert(response.ok);
        assert.deepEqual(
          Buffer.from(await response.arrayBuffer()),
          pdfFixture.pageBytes,
        );
        const denied = await guest.post(
          "/api/links/download/dataroom-document",
          { data: { linkId: link.id, documentId: pdfFixture.document.id } },
        );
        assert.equal(denied.status(), 403);
        return data;
      },
    );
    await checked(
      "Owner can enable download and verified guest receives byte-identical original PDF",
      async () => {
        await json(
          await owner.context.put(`/api/links/${link.id}`, {
            data: {
              teamId: owner.team.id,
              targetId: room.id,
              linkType: "DATAROOM_LINK",
              audienceType: "GENERAL",
              emailProtected: true,
              emailAuthenticated: true,
              allowList: [allowedEmail],
              denyList: [],
              allowDownload: true,
              enableNotification: false,
            },
          }),
          200,
          "Enable download",
        );
        const download = await json(
          await guest.post("/api/links/download/dataroom-document", {
            data: { linkId: link.id, documentId: pdfFixture.document.id },
          }),
          200,
          "Guest download",
        );
        assert(loopback(download.downloadUrl));
        const response = await fetch(download.downloadUrl);
        assert(response.ok);
        assert.deepEqual(
          Buffer.from(await response.arrayBuffer()),
          pdfFixture.bytes,
        );
      },
    );
    await checked(
      "Revoke link blocks established and new guest access",
      async () => {
        const revoked = await owner.context.delete(`/api/links/${link.id}`);
        assert.equal(revoked.status(), 204);
        const stored = await prisma.link.findUnique({ where: { id: link.id } });
        assert(stored.isArchived && stored.deletedAt);
        for (const context of [guest, anonymous])
          assert.equal(
            (
              await context.post("/api/views-dataroom", {
                data: { ...guestBody, email: allowedEmail },
              })
            ).status(),
            404,
          );
      },
    );
    await checked(
      "Revoked guest cannot obtain new page or download URLs",
      async () => {
        for (const response of [
          await guest.post("/api/views-dataroom", { data: documentBody }),
          await guest.post("/api/views/pages", {
            data: {
              viewId: documentView.viewId,
              documentVersionId: pdfFixture.version.id,
              pageNumbers: [1],
            },
          }),
          await guest.post("/api/links/download/dataroom-document", {
            data: { linkId: link.id, documentId: pdfFixture.document.id },
          }),
        ]) {
          assert([401, 403, 404].includes(response.status()));
          const body = await response.json();
          assert(!body.file && !body.pages && !body.downloadUrl);
        }
      },
    );
    await checked(
      "Owner deletes room through real authenticated API",
      async () => {
        assert.equal(
          (await owner.context.delete(`${endpoint}/${room.id}`)).status(),
          204,
        );
        assert.equal(
          await prisma.dataroom.findUnique({ where: { id: room.id } }),
          null,
        );
      },
    );

  } catch (error) {
    result.failure = {
      type: error.name,
      step: result.checks.at(-1)?.name || "initialization",
    };
    process.exitCode = 1;
  } finally {
    if (process.env.ROOMLINE_KEEP_FIXTURES !== "1") {
      for (const id of fixtures.teams) {
        try {
          let continuation;
          do {
            const objects = await s3.send(
              new ListObjectsV2Command({
                Bucket,
                Prefix: `${id}/`,
                ContinuationToken: continuation,
              }),
            );
            for (const object of objects.Contents || [])
              await s3.send(
                new DeleteObjectCommand({ Bucket, Key: object.Key }),
              );
            continuation = objects.IsTruncated
              ? objects.NextContinuationToken
              : undefined;
          } while (continuation);
          await prisma.team.deleteMany({ where: { id } });
        } catch (error) {
          result.cleanup = { status: "failed", errorType: error.name };
          process.exitCode = 1;
        }
      }
      for (const id of fixtures.users)
        await prisma.user.deleteMany({ where: { id } }).catch(() => {});
    }
    if (process.env.ROOMLINE_KEEP_FIXTURES === "1" && ownerForReview) {
      await ownerForReview.context.storageState({ path: path.join(runtimeDir, "owner-auth-state.json") });
      fs.chmodSync(path.join(runtimeDir, "owner-auth-state.json"), 0o600);
      fs.writeFileSync(path.join(runtimeDir, "integration-fixtures.json"), JSON.stringify({ runId, ...fixtures }, null, 2), { mode: 0o600 });
    }
    await Promise.all(contexts.map((context) => context.dispose()));
    await prisma.$disconnect();
    s3.destroy();
    fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      path.join(runtimeDir, "real-integration-results.json"),
      JSON.stringify(result, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `Real local integration: ${result.checks.filter((check) => check.status === "passed").length}/${result.checks.length} checks passed. Auth state, codes, and cookies were not printed.`,
    );
  }
})();
