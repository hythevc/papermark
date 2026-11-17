#!/usr/bin/env node
/** Run with node --import tsx --env-file=<private app.env>; actual DB/S3, no browser. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PDFDocument } = require("pdf-lib");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const loopback = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
assert(
  process.env.NODE_ENV === "development" &&
    process.env.ROOMLINE_LOCAL_INTEGRATION === "1",
);
assert(loopback(database.href) && database.pathname === "/roomline_runtime");
assert(loopback(process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || "http://invalid"));
const repo = fs.realpathSync(path.resolve(__dirname, "../.."));
const runtime = fs.realpathSync(
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime",
);
assert(runtime !== repo && !runtime.startsWith(repo + path.sep));
const ownerId = JSON.parse(
  fs.readFileSync(path.join(runtime, "integration-fixtures.json"), "utf8"),
).users[0];
assert(typeof ownerId === "string" && ownerId);
const prisma = require("../../lib/prisma.ts").default;
const {
  createVersionCandidate,
  publishVersionCandidate,
} = require("../../lib/documents/version-publication.ts");
const { renderPdfVersion } = require("../../lib/documents/render-pdf.ts");
const s3 = new S3Client({
  endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
  region: process.env.NEXT_PRIVATE_UPLOAD_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.NEXT_PRIVATE_UPLOAD_BUCKET;
const namespace = `roomline-version-race-${Date.now()}`;
const report = {
  checkedAt: new Date().toISOString(),
  mode: "actual isolated PostgreSQL transactions and S3/PDF renderer; no API or auth mocks",
  checks: [],
  limitations: [
    "Publication helpers and renderer are exercised directly; this proof does not issue the versions HTTP request.",
  ],
};
let team;
async function checked(name, fn) {
  try {
    await fn();
    report.checks.push({ name, status: "passed" });
    console.log(`${name}: passed`);
  } catch (error) {
    report.checks.push({ name, status: "failed", errorType: error.name });
    throw error;
  }
}
(async () => {
  try {
    team = await prisma.team.create({
      data: {
        name: namespace,
        users: { create: { userId: ownerId, role: "ADMIN", status: "ACTIVE" } },
      },
    });
    fs.writeFileSync(
      path.join(runtime, "version-concurrency-fixtures.json"),
      JSON.stringify({ namespace, teamId: team.id }),
      { mode: 0o600 },
    );
    const pdf = await PDFDocument.create();
    pdf
      .addPage([200, 300])
      .drawText("Isolated version race fixture", { x: 10, y: 200, size: 8 });
    const bytes = Buffer.from(await pdf.save());
    const keys = [
      "source.pdf",
      "candidate-a.pdf",
      "candidate-b.pdf",
      "invalid.pdf",
    ].map((name) => `${team.id}/doc_${Date.now()}/${name}`);
    for (let index = 0; index < keys.length; index++)
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: keys[index],
          Body: index === 3 ? Buffer.from("not a PDF") : bytes,
          ContentType: "application/pdf",
        }),
      );
    const document = await prisma.document.create({
      data: {
        teamId: team.id,
        ownerId,
        name: "fixture.pdf",
        file: keys[0],
        originalFile: keys[0],
        type: "pdf",
        contentType: "application/pdf",
        storageType: "S3_PATH",
        versions: {
          create: {
            file: keys[0],
            originalFile: keys[0],
            type: "pdf",
            contentType: "application/pdf",
            storageType: "S3_PATH",
            versionNumber: 1,
            isPrimary: true,
          },
        },
      },
      include: { versions: true },
    });
    const scope = { teamId: team.id, documentId: document.id };
    const source = document.versions[0];
    await renderPdfVersion({ ...scope, documentVersionId: source.id });
    const data = (file) => ({
      file,
      originalFile: file,
      type: "pdf",
      contentType: "application/pdf",
      storageType: "S3_PATH",
      fileSize: bytes.length,
    });
    let candidates;
    await checked(
      "Concurrent candidate allocation produces unique ordered versions without changing the primary",
      async () => {
        candidates = await Promise.all(
          keys
            .slice(1, 3)
            .map((file) =>
              createVersionCandidate({ ...scope, data: data(file) }),
            ),
        );
        assert.deepEqual(
          candidates.map((entry) => entry.version.versionNumber).sort(),
          [2, 3],
        );
        assert(
          candidates.every(
            (entry) =>
              !entry.version.isPrimary && entry.previousPrimaryId === source.id,
          ),
        );
        assert.equal(
          (
            await prisma.documentVersion.findFirst({
              where: { documentId: document.id, isPrimary: true },
            })
          ).id,
          source.id,
        );
      },
    );
    for (const entry of candidates)
      await renderPdfVersion({ ...scope, documentVersionId: entry.version.id });
    let primary;
    await checked(
      "Concurrent publication admits one winner and rejects a stale source instead of overwriting it",
      async () => {
        const outcomes = await Promise.allSettled(
          candidates.map((entry) =>
            publishVersionCandidate({
              ...scope,
              versionId: entry.version.id,
              previousPrimaryId: entry.previousPrimaryId,
              requirePages: true,
            }),
          ),
        );
        assert.equal(
          outcomes.filter((outcome) => outcome.status === "fulfilled").length,
          1,
        );
        const rejected = outcomes.find(
          (outcome) => outcome.status === "rejected",
        );
        assert.equal(rejected.reason.code, "conflict");
        const primaries = await prisma.documentVersion.findMany({
          where: { documentId: document.id, isPrimary: true },
        });
        assert.equal(primaries.length, 1);
        primary = primaries[0];
        assert(primary.hasPages && primary.numPages === 1);
        const current = await prisma.document.findUnique({
          where: { id: document.id },
        });
        assert.equal(current.file, primary.file);
        assert.equal(current.originalFile, primary.originalFile);
        assert.equal(
          (
            await prisma.documentVersion.findUnique({
              where: { id: source.id },
            })
          ).file,
          keys[0],
        );
      },
    );
    await checked(
      "Actual inline renderer failure leaves the usable primary and document fields unchanged",
      async () => {
        const bad = await createVersionCandidate({
          ...scope,
          data: data(keys[3]),
        });
        await assert.rejects(
          renderPdfVersion({ ...scope, documentVersionId: bad.version.id }),
          /not a PDF/,
        );
        await assert.rejects(
          publishVersionCandidate({
            ...scope,
            versionId: bad.version.id,
            previousPrimaryId: bad.previousPrimaryId,
            requirePages: true,
          }),
          /not ready/,
        );
        assert.equal(
          (
            await prisma.documentVersion.findFirst({
              where: { documentId: document.id, isPrimary: true },
            })
          ).id,
          primary.id,
        );
        assert.equal(
          (await prisma.document.findUnique({ where: { id: document.id } }))
            .file,
          primary.file,
        );
        await prisma.documentVersion.deleteMany({
          where: { id: bad.version.id, isPrimary: false },
        });
      },
    );
    await checked(
      "Wrong-team candidate creation and publication cannot mutate another workspace",
      async () => {
        const count = await prisma.documentVersion.count({
          where: { documentId: document.id },
        });
        await assert.rejects(
          createVersionCandidate({
            teamId: "isolated-wrong-team",
            documentId: document.id,
            data: data(keys[1]),
          }),
          /Document not found/,
        );
        await assert.rejects(
          publishVersionCandidate({
            teamId: "isolated-wrong-team",
            documentId: document.id,
            versionId: primary.id,
            previousPrimaryId: primary.id,
          }),
          /Document version not found/,
        );
        assert.equal(
          await prisma.documentVersion.count({
            where: { documentId: document.id },
          }),
          count,
        );
      },
    );
  } catch (error) {
    report.failure = { errorType: error.name };
    process.exitCode = 1;
    fs.writeFileSync(
      path.join(runtime, "version-concurrency-error.txt"),
      String(error.stack || error),
      { mode: 0o600 },
    );
  } finally {
    try {
      if (team) {
        assert.equal(
          (await prisma.team.findUnique({ where: { id: team.id } })).name,
          namespace,
        );
        const objects = await s3.send(
          new ListObjectsV2Command({ Bucket, Prefix: `${team.id}/` }),
        );
        for (const item of objects.Contents || [])
          await s3.send(new DeleteObjectCommand({ Bucket, Key: item.Key }));
        await prisma.team.delete({ where: { id: team.id } });
        assert.equal(await prisma.team.count({ where: { id: team.id } }), 0);
        assert.equal(
          (
            await s3.send(
              new ListObjectsV2Command({ Bucket, Prefix: `${team.id}/` }),
            )
          ).KeyCount,
          0,
        );
      }
      report.cleanup = "verified";
    } catch (error) {
      report.cleanup = "failed";
      process.exitCode = 1;
    }
    await prisma.$disconnect();
    s3.destroy();
    fs.mkdirSync(path.join(repo, "artifacts/runtime"), { recursive: true });
    fs.writeFileSync(
      path.join(repo, "artifacts/runtime/version-concurrency.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      `Version publication proof: ${report.checks.filter((check) => check.status === "passed").length}/${report.checks.length} passed; fixture identifiers and credentials were not printed.`,
    );
  }
})();
