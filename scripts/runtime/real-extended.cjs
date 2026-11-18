#!/usr/bin/env node
/**
 * Real isolated API proofs; requires the core harness's retained owner session.
 * Run with --env-file=<private app.env> and --phase=onboarding|tus|redaction.
 * Use --cleanup with the final phase, or --cleanup-only, to remove own fixtures.
 */
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
  ListObjectsV2Command,
  DeleteObjectCommand,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");

const phase =
  process.argv.find((arg) => arg.startsWith("--phase="))?.split("=")[1] ||
  "all";
assert(
  ["onboarding", "tus", "redaction", "all"].includes(phase),
  "Choose a supported proof phase.",
);
const repo = fs.realpathSync(path.resolve(__dirname, "../.."));
const runtimeDir = fs.realpathSync(
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime",
);
const loopback = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
const baseURL = process.env.NEXTAUTH_URL;
assert(
  process.env.NODE_ENV === "development" &&
    process.env.ROOMLINE_LOCAL_INTEGRATION === "1" &&
    baseURL &&
    loopback(baseURL),
  "Only explicit loopback development integration is supported.",
);
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
assert(
  loopback(database.href) && database.pathname === "/roomline_runtime",
  "Refusing a non-isolated database.",
);
assert(
  runtimeDir !== repo && !runtimeDir.startsWith(repo + path.sep),
  "Private state must remain outside the checkout.",
);
assert(
  loopback(process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || "http://invalid"),
  "Only loopback object storage is supported.",
);
fs.chmodSync(runtimeDir, 0o700);
const authFile = path.join(runtimeDir, "owner-auth-state.json");
assert(fs.realpathSync(authFile).startsWith(runtimeDir + path.sep));
const retained = JSON.parse(
  fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8"),
);
assert(Array.isArray(retained.users) && typeof retained.users[0] === "string");
const stateFile = path.join(runtimeDir, "extended-fixtures.json");
let state = fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
  : {
      runId: `roomline-extended-${Date.now()}`,
      ownerId: retained.users[0],
      teams: [],
      completed: [],
      checks: [],
    };
assert(
  /^roomline-extended-\d+$/.test(state.runId) &&
    state.ownerId === retained.users[0],
);
assert(
  Array.isArray(state.teams) &&
    Array.isArray(state.completed) &&
    Array.isArray(state.checks),
);
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
const contexts = [];
let owner;
let failure;
function save() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
    mode: 0o600,
  });
  fs.chmodSync(stateFile, 0o600);
  const report = {
    checkedAt: new Date().toISOString(),
    mode: "real local HTTP APIs, retained real session, isolated PostgreSQL/Redis/S3; no auth mocks",
    checks: state.checks,
    completedPhases: state.completed,
    cleanup:
      state.cleanup || "own isolated fixtures retained for the next phase",
    ...(failure ? { failure } : {}),
    limitations: [
      "Local services establish these isolated flows, not hosted Railway, Vercel, SMTP or production-provider delivery.",
      "Redaction uses synthetic private-text fixtures. AI detection and Office/Keynote conversion services are not exercised.",
      "Private auth state, fixture identifiers, object keys and source documents remain outside the checkout.",
    ],
  };
  const output = path.join(repo, "artifacts/runtime/extended-local.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
}
async function checked(name, fn) {
  state.checks = state.checks.filter((check) => check.name !== name);
  try {
    const value = await fn();
    state.checks.push({ name, status: "passed" });
    console.log(`${name}: passed`);
    save();
    return value;
  } catch (error) {
    state.checks.push({ name, status: "failed", errorType: error.name });
    console.error(`${name}: failed (${error.name})`);
    throw error;
  }
}
async function context(auth = true) {
  const value = await request.newContext({
    baseURL,
    timeout: 600000,
    ...(auth ? { storageState: authFile } : {}),
  });
  contexts.push(value);
  return value;
}
async function json(response, expected, operation) {
  assert.equal(
    response.status(),
    expected,
    `${operation}: expected HTTP ${expected}, received ${response.status()}`,
  );
  return response.json();
}
async function team(label) {
  const previous = state.teams.find((entry) => entry.label === label);
  if (previous) {
    const value = await prisma.team.findUnique({ where: { id: previous.id } });
    assert(
      value?.name.startsWith(state.runId),
      "Only this harness's own workspace can be resumed.",
    );
    return value;
  }
  const value = await json(
    await owner.post("/api/teams", {
      data: { team: `${state.runId}-${label}` },
    }),
    201,
    "Create own free workspace",
  );
  assert(
    value.id && value.name.startsWith(state.runId) && value.plan === "free",
  );
  const membership = await prisma.userTeam.findUnique({
    where: { userId_teamId: { userId: state.ownerId, teamId: value.id } },
  });
  assert(
    membership?.role === "ADMIN" &&
      membership.status === "ACTIVE" &&
      !membership.blockedAt,
  );
  state.teams.push({ id: value.id, label });
  save();
  return value;
}
const trialBody = (industry = false) => ({
  name: `${state.runId}-room`,
  fullName: "Runtime QA Owner",
  companyName: "Runtime QA Company",
  ...(industry
    ? { industry: "Technology" }
    : { useCase: "due-diligence", companySize: "1–10", tools: "None" }),
});
async function onboarding() {
  const first = await checked(
    "Onboarding creates a real free workspace with active admin membership",
    () => team("onboarding-use-case"),
  );
  const endpoint = `/api/teams/${first.id}/datarooms/trial`;
  await checked(
    "Trial rejects malformed values without changing free workspace",
    async () => {
      assert.equal(
        (
          await owner.post(endpoint, { data: { ...trialBody(), name: {} } })
        ).status(),
        400,
      );
      assert.equal(
        (await prisma.team.findUnique({ where: { id: first.id } })).plan,
        "free",
      );
      assert.equal(
        await prisma.dataroom.count({ where: { teamId: first.id } }),
        0,
      );
    },
  );
  await checked(
    "Concurrent use-case trial requests create exactly one real room and seven-day trial",
    async () => {
      const before = Date.now();
      const responses = await Promise.all([
        owner.post(endpoint, { data: trialBody() }),
        owner.post(endpoint, { data: trialBody() }),
      ]);
      const statuses = responses.map((response) => response.status()).sort();
      assert.equal(statuses.filter((status) => status === 201).length, 1);
      assert(statuses.every((status) => [201, 400, 409].includes(status)));
      const current = await prisma.team.findUnique({
        where: { id: first.id },
        include: { datarooms: true },
      });
      assert.equal(current.plan, "free+drtrial");
      assert.equal(current.datarooms.length, 1);
      assert(
        current.trialStartedAt.getTime() >= before &&
          current.trialStartedAt.getTime() <= Date.now(),
      );
      assert.equal(
        current.trialEndsAt - current.trialStartedAt,
        7 * 24 * 60 * 60 * 1000,
      );
      if (!process.env.TRIGGER_SECRET_KEY)
        assert(!current.trialReminderRunId && !current.trialExpiredRunId);
    },
  );
  const second = await team("onboarding-industry");
  const secondEndpoint = `/api/teams/${second.id}/datarooms/trial`;
  await checked(
    "Blocked workspace membership cannot provision a trial",
    async () => {
      const where = {
        userId_teamId: { userId: state.ownerId, teamId: second.id },
      };
      await prisma.userTeam.update({ where, data: { blockedAt: new Date() } });
      try {
        assert.equal(
          (
            await owner.post(secondEndpoint, { data: trialBody(true) })
          ).status(),
          403,
        );
        assert.equal(
          await prisma.dataroom.count({ where: { teamId: second.id } }),
          0,
        );
        assert.equal(
          (await prisma.team.findUnique({ where: { id: second.id } })).plan,
          "free",
        );
      } finally {
        await prisma.userTeam.update({ where, data: { blockedAt: null } });
      }
    },
  );
  await checked(
    "Industry onboarding form creates a real trial without optional worker credentials",
    async () => {
      await json(
        await owner.post(secondEndpoint, { data: trialBody(true) }),
        201,
        "Industry trial",
      );
      const current = await prisma.team.findUnique({
        where: { id: second.id },
      });
      assert.equal(current.plan, "free+drtrial");
      assert.equal(
        current.trialEndsAt - current.trialStartedAt,
        7 * 24 * 60 * 60 * 1000,
      );
      assert.equal(
        await prisma.dataroom.count({ where: { teamId: second.id } }),
        1,
      );
    },
  );
}
async function tus() {
  const workspace = await team("tus");
  const anonymous = await context(false);
  await checked("Unauthenticated TUS creation is denied", async () => {
    assert.equal(
      (
        await anonymous.post("/api/file/tus", {
          headers: { "Tus-Resumable": "1.0.0", "Upload-Length": "1" },
        })
      ).status(),
      401,
    );
  });
  await checked(
    "Real TUS POST, PATCH, HEAD and resumed PATCH preserve exact S3 bytes",
    async () => {
      const bytes = Buffer.alloc(8 * 1024 * 1024 + 321, 0x6b);
      bytes.write("Roomline isolated resumable-upload fixture");
      const metadata = {
        teamId: workspace.id,
        ownerId: state.ownerId,
        fileName: `${state.runId}.txt`,
        contentType: "text/plain",
        numPages: "1",
        relativePath: "",
      };
      const response = await owner.post("/api/file/tus", {
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(bytes.length),
          "Upload-Metadata": Object.entries(metadata)
            .map(
              ([key, value]) =>
                `${key} ${Buffer.from(value).toString("base64")}`,
            )
            .join(","),
        },
      });
      assert.equal(
        response.status(),
        201,
        "TUS creation must reach configured S3 storage.",
      );
      const uploadURL = new URL(response.headers().location, baseURL);
      assert.equal(uploadURL.origin, new URL(baseURL).origin);
      assert(uploadURL.pathname.startsWith("/api/file/tus/"));
      state.tusUrl = uploadURL.href;
      save();
      const firstLength = 8 * 1024 * 1024;
      const patchHeaders = (offset) => ({
        "Tus-Resumable": "1.0.0",
        "Content-Type": "application/offset+octet-stream",
        "Upload-Offset": String(offset),
      });
      assert.equal(
        (
          await owner.patch(uploadURL.href, {
            headers: patchHeaders(0),
            data: bytes.subarray(0, firstLength),
          })
        ).status(),
        204,
      );
      const head = await owner.head(uploadURL.href, {
        headers: { "Tus-Resumable": "1.0.0" },
      });
      assert.equal(head.status(), 200);
      assert.equal(Number(head.headers()["upload-offset"]), firstLength);
      const resumed = await context();
      assert.equal(
        (
          await resumed.patch(uploadURL.href, {
            headers: patchHeaders(firstLength),
            data: bytes.subarray(firstLength),
          })
        ).status(),
        204,
      );
      const complete = await resumed.head(uploadURL.href, {
        headers: { "Tus-Resumable": "1.0.0" },
      });
      assert.equal(complete.status(), 200);
      assert.equal(Number(complete.headers()["upload-offset"]), bytes.length);
      const key = Buffer.from(
        uploadURL.pathname.split("/api/file/tus/")[1],
        "base64url",
      ).toString();
      assert(key.startsWith(`${workspace.id}/`));
      const object = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
      assert.equal(object.ContentType, "text/plain");
      assert.deepEqual(
        Buffer.from(await object.Body.transformToByteArray()),
        bytes,
      );
    },
  );
  await checked(
    "Real authenticated user without target membership cannot inspect or create TUS uploads",
    async () => {
      const where = {
        userId_teamId: { userId: state.ownerId, teamId: workspace.id },
      };
      await prisma.userTeam.delete({ where });
      try {
        assert.equal(
          (
            await owner.head(state.tusUrl, {
              headers: { "Tus-Resumable": "1.0.0" },
            })
          ).status(),
          403,
        );
        const metadata = `teamId ${Buffer.from(workspace.id).toString("base64")},fileName ${Buffer.from("denied.txt").toString("base64")}`;
        assert.equal(
          (
            await owner.post("/api/file/tus", {
              headers: {
                "Tus-Resumable": "1.0.0",
                "Upload-Length": "1",
                "Upload-Metadata": metadata,
              },
            })
          ).status(),
          403,
        );
      } finally {
        await prisma.userTeam.create({
          data: {
            userId: state.ownerId,
            teamId: workspace.id,
            role: "ADMIN",
            status: "ACTIVE",
          },
        });
      }
    },
  );
}
async function redaction() {
  const teamId = process.env.ROOMLINE_REDACTION_TEAM_ID;
  const flags = JSON.parse(process.env.ROOMLINE_FEATURE_FLAGS || "{}");
  assert(
    teamId &&
      Array.isArray(flags.redaction) &&
      flags.redaction.includes(teamId),
    "A dedicated explicit redaction fixture allowlist is required.",
  );
  let workspace = await prisma.team.findUnique({ where: { id: teamId } });
  if (workspace)
    assert(
      workspace.name.startsWith(state.runId),
      "Refusing to mutate a redaction workspace from another fixture.",
    );
  else {
    workspace = await prisma.team.create({
      data: {
        id: teamId,
        name: `${state.runId}-redaction`,
        users: {
          create: { userId: state.ownerId, role: "ADMIN", status: "ACTIVE" },
        },
      },
    });
    state.teams.push({ id: teamId, label: "redaction" });
    save();
  }
  let document, source, sourceVersion;
  await checked(
    "Real PDF upload persists source bytes and renders pages for the owned redaction workspace",
    async () => {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf.setTitle("PRIVATE-EXTENDED-SENTINEL metadata");
      const page = pdf.addPage([600, 800]);
      page.drawText("PRIVATE-EXTENDED-SENTINEL", {
        x: 50,
        y: 700,
        size: 20,
        font,
      });
      page.drawText("PUBLIC INFORMATION", { x: 50, y: 500, size: 20, font });
      source = Buffer.from(await pdf.save());
      const key = `${teamId}/doc_${Date.now()}/source.pdf`;
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: source,
          ContentType: "application/pdf",
        }),
      );
      document = await json(
        await owner.post(`/api/teams/${teamId}/documents`, {
          data: {
            name: `${state.runId}.pdf`,
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
        "Source PDF upload",
      );
      sourceVersion = await prisma.documentVersion.findFirst({
        where: { documentId: document.id, isPrimary: true },
        include: { pages: true },
      });
      assert(
        sourceVersion?.hasPages &&
          sourceVersion.pages.length === 1 &&
          sourceVersion.file === key,
      );
    },
  );
  const endpoint = `/api/teams/${teamId}/documents/${document.id}/redactions`;
  const job = await checked(
    "Real manual-redaction POST creates a scoped review job",
    async () => {
      const value = await json(
        await owner.post(endpoint, { data: {} }),
        201,
        "Create manual redaction",
      );
      assert(value.id);
      const persisted = await prisma.documentRedactionJob.findUnique({
        where: { id: value.id },
      });
      assert(
        persisted.teamId === teamId &&
          persisted.documentId === document.id &&
          persisted.documentVersionId === sourceVersion.id &&
          persisted.status === "REVIEW",
      );
      return value;
    },
  );
  const jobURL = `${endpoint}/${job.id}`;
  await checked(
    "Manual-redaction region PATCH and source PNG GET use the real source",
    async () => {
      const value = await json(
        await owner.patch(jobURL, {
          data: {
            action: "add",
            pageNumber: 1,
            x: 50,
            y: 70,
            width: 600,
            height: 90,
          },
        }),
        200,
        "Add manual region",
      );
      assert(
        value.region?.source === "MANUAL" && value.region.status === "ACCEPTED",
      );
      const png = await owner.get(`${jobURL}/page/1`);
      assert.equal(png.status(), 200);
      assert.equal(png.headers()["content-type"], "image/png");
      assert.match(png.headers()["cache-control"], /no-store/);
      assert.equal(
        (await png.body()).subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
      );
    },
  );
  await checked(
    "Wrong-team scope and blocked membership cannot read or apply redaction jobs",
    async () => {
      const other = await team("redaction-wrong-scope");
      assert.equal(
        (
          await owner.get(
            `/api/teams/${other.id}/documents/${document.id}/redactions/${job.id}`,
          )
        ).status(),
        404,
      );
      const where = { userId_teamId: { userId: state.ownerId, teamId } };
      await prisma.userTeam.update({ where, data: { blockedAt: new Date() } });
      try {
        assert.equal((await owner.get(jobURL)).status(), 403);
        assert.equal(
          (await owner.post(jobURL, { data: { action: "apply" } })).status(),
          403,
        );
        assert.equal(
          (
            await prisma.documentRedactionJob.findUnique({
              where: { id: job.id },
            })
          ).status,
          "REVIEW",
        );
      } finally {
        await prisma.userTeam.update({ where, data: { blockedAt: null } });
      }
    },
  );
  await checked(
    "Real apply publishes a rendered derivative, removes text, masks pixels and preserves the old version",
    async () => {
      const applied = await json(
        await owner.post(jobURL, { data: { action: "apply" } }),
        200,
        "Apply manual redaction",
      );
      const primary = await prisma.documentVersion.findUnique({
        where: { id: applied.versionId },
        include: { pages: true },
      });
      const old = await prisma.documentVersion.findUnique({
        where: { id: sourceVersion.id },
      });
      const current = await prisma.document.findUnique({
        where: { id: document.id },
      });
      assert(
        primary.isPrimary && primary.hasPages && primary.pages.length === 1,
      );
      assert(
        primary.id !== old.id &&
          !old.isPrimary &&
          old.file === sourceVersion.file &&
          old.originalFile === sourceVersion.originalFile,
      );
      assert.equal(primary.file, primary.originalFile);
      assert.equal(current.file, primary.file);
      assert.equal(current.originalFile, primary.file);
      const originalObject = await s3.send(
        new GetObjectCommand({ Bucket, Key: old.file }),
      );
      assert.deepEqual(
        Buffer.from(await originalObject.Body.transformToByteArray()),
        source,
      );
      const object = await s3.send(
        new GetObjectCommand({ Bucket, Key: primary.file }),
      );
      const bytes = Buffer.from(await object.Body.transformToByteArray());
      const mupdf = await import("mupdf");
      const pdf = new mupdf.PDFDocument(bytes);
      try {
        const page = pdf.loadPage(0);
        try {
          const text = page.toStructuredText();
          try {
            assert.equal(text.asText().trim(), "");
          } finally {
            text.destroy();
          }
          assert.doesNotMatch(
            pdf.getMetaData("info:Title") || "",
            /PRIVATE-EXTENDED-SENTINEL/,
          );
          const pixels = page.toPixmap(
            [1, 0, 0, 1, 0, 0],
            mupdf.ColorSpace.DeviceRGB,
            false,
            true,
          );
          try {
            const values = pixels.getPixels();
            const channels = pixels.getNumberOfComponents();
            const sample = (x, y) =>
              Array.from(
                values.subarray(
                  (y * 600 + x) * channels,
                  (y * 600 + x) * channels + 3,
                ),
              );
            assert(sample(100, 100).every((value) => value < 10));
            assert(sample(500, 500).every((value) => value > 240));
          } finally {
            pixels.destroy();
          }
        } finally {
          page.destroy();
        }
      } finally {
        pdf.destroy();
      }
      assert.equal(
        (
          await prisma.documentRedactionJob.findUnique({
            where: { id: job.id },
          })
        ).status,
        "APPLIED",
      );
    },
  );
  await checked(
    "Applied-job replay and region edits are denied without creating another version",
    async () => {
      assert.equal(
        (await owner.post(jobURL, { data: { action: "apply" } })).status(),
        409,
      );
      assert.equal(
        (
          await owner.patch(jobURL, {
            data: {
              action: "add",
              pageNumber: 1,
              x: 10,
              y: 10,
              width: 10,
              height: 10,
            },
          })
        ).status(),
        409,
      );
      assert.equal(
        await prisma.documentVersion.count({
          where: { documentId: document.id },
        }),
        2,
      );
    },
  );
}
async function cleanup() {
  for (const entry of state.teams) {
    const value = await prisma.team.findUnique({ where: { id: entry.id } });
    if (!value) continue;
    assert(
      value.name.startsWith(state.runId),
      "Cleanup only removes this harness's own namespace.",
    );
    let continuation;
    do {
      const objects = await s3.send(
        new ListObjectsV2Command({
          Bucket,
          Prefix: `${entry.id}/`,
          ContinuationToken: continuation,
        }),
      );
      for (const object of objects.Contents || [])
        await s3.send(new DeleteObjectCommand({ Bucket, Key: object.Key }));
      continuation = objects.IsTruncated
        ? objects.NextContinuationToken
        : undefined;
    } while (continuation);
    const partials = await s3.send(
      new ListMultipartUploadsCommand({ Bucket, Prefix: `${entry.id}/` }),
    );
    for (const partial of partials.Uploads || [])
      await s3.send(
        new AbortMultipartUploadCommand({
          Bucket,
          Key: partial.Key,
          UploadId: partial.UploadId,
        }),
      );
    await prisma.team.delete({ where: { id: entry.id } });
  }
  state.cleanup = "completed";
  save();
}
(async () => {
  try {
    owner = await context();
    const session = await json(
      await owner.get("/api/auth/session"),
      200,
      "Real retained owner session",
    );
    assert.equal(session.user?.id, state.ownerId);
    if (process.argv.includes("--cleanup-only")) {
      await cleanup();
      return;
    }
    for (const [name, run] of [
      ["onboarding", onboarding],
      ["tus", tus],
      ["redaction", redaction],
    ]) {
      if (
        (phase === "all" || phase === name) &&
        !state.completed.includes(name)
      ) {
        await run();
        state.completed.push(name);
        save();
      }
    }
    if (phase === "all" || process.argv.includes("--cleanup")) await cleanup();
  } catch (error) {
    failure = {
      errorType: error.name,
      step: state.checks.at(-1)?.name || "initialization",
    };
    fs.writeFileSync(
      path.join(runtimeDir, "extended-error.txt"),
      String(error.stack || error),
      { mode: 0o600 },
    );
    process.exitCode = 1;
  } finally {
    save();
    await Promise.all(contexts.map((value) => value.dispose()));
    await prisma.$disconnect();
    s3.destroy();
    console.log(
      `Extended local proof: ${state.checks.filter((check) => check.status === "passed").length}/${state.checks.length} checks passed. Credentials, cookies, codes and fixture IDs were not printed.`,
    );
  }
})();
