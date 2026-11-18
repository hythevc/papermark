#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { request } = require("playwright");
const { PrismaClient } = require("@prisma/client");

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
  throw new Error("Explicit local integration mode is required.");
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
if (!loopback(database.href) || database.pathname !== "/roomline_runtime")
  throw new Error("Isolated database required.");
const repoRoot = fs.realpathSync(path.resolve(__dirname, "../.."));
const privateDir = fs.realpathSync(runtimeDir);
if (privateDir === repoRoot || privateDir.startsWith(repoRoot + path.sep))
  throw new Error("Private state must stay outside the checkout.");
const fixtures = JSON.parse(
  fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8"),
);
const prisma = new PrismaClient();
const result = {
  checkedAt: new Date().toISOString(),
  mode: "real retained owner session, SMTP OTP, Postgres and S3; no route/auth mocks",
  checks: [],
  limitations: [
    "Previously issued signed URLs remain capabilities until expiry; checks concern new URL issuance.",
  ],
};
let owner, guest;
async function check(name, fn) {
  try {
    const value = await fn();
    result.checks.push({ name, status: "passed" });
    console.log(`${name}: passed`);
    return value;
  } catch (error) {
    result.checks.push({ name, status: "failed", errorType: error.name });
    throw error;
  }
}
async function json(response, status) {
  assert.equal(response.status(), status);
  return response.json();
}
async function codeFor(email) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const list = await (await fetch(`${mailURL}/api/v1/messages`)).json();
    const item = list.messages.find((item) =>
      item.To?.some((to) => to.Address?.toLowerCase() === email),
    );
    if (item) {
      const message = await (
        await fetch(`${mailURL}/api/v1/message/${item.ID}`)
      ).json();
      const code = String(message.Text || message.HTML || "").match(
        /\b\d{6}\b/,
      )?.[0];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("LocalDeliveryTimeout");
}
(async () => {
  try {
    owner = await request.newContext({
      baseURL,
      timeout: 600000,
      storageState: path.join(runtimeDir, "owner-auth-state.json"),
    });
    guest = await request.newContext({ baseURL, timeout: 600000 });
    const session = await json(await owner.get("/api/auth/session"), 200);
    assert.equal(session.user?.id, fixtures.users[0]);
    const room = await prisma.dataroom.findFirst({
      where: { id: fixtures.rooms[0], teamId: fixtures.teams[0] },
    });
    assert(room);
    const attachment = await prisma.dataroomDocument.findFirst({
      where: { dataroomId: room.id },
      include: {
        document: {
          include: {
            versions: { where: { isPrimary: true }, include: { pages: true } },
          },
        },
      },
    });
    assert(attachment?.document.versions[0]?.pages.length);
    const document = attachment.document;
    const version = document.versions[0];
    const email = `page-revoke-${Date.now()}@roomline.test`;
    const link = await check(
      "Create a fresh owned email-verified link through the authenticated API",
      async () => {
        const data = await json(
          await owner.post("/api/links", {
            data: {
              teamId: room.teamId,
              targetId: room.id,
              linkType: "DATAROOM_LINK",
              name: "Page revocation regression",
              audienceType: "GENERAL",
              emailProtected: true,
              emailAuthenticated: true,
              allowList: [email],
              denyList: [],
              allowDownload: true,
              enableNotification: false,
            },
          }),
          200,
        );
        assert(data.id);
        return data;
      },
    );
    fs.writeFileSync(
      path.join(runtimeDir, "page-revocation-fixture.json"),
      JSON.stringify({
        linkId: link.id,
        roomId: room.id,
        documentId: document.id,
        versionId: version.id,
      }),
      { mode: 0o600 },
    );
    const roomBody = {
      linkId: link.id,
      dataroomId: room.id,
      linkType: "DATAROOM_LINK",
      viewType: "DATAROOM_VIEW",
      userId: null,
      ownerId: null,
      email,
    };
    await check(
      "Verify a real guest using the SMTP-delivered one-time code",
      async () => {
        const challenge = await json(
          await guest.post("/api/views-dataroom", { data: roomBody }),
          200,
        );
        assert.equal(challenge.type, "email-verification");
        const code = await codeFor(email);
        const accepted = await json(
          await guest.post("/api/views-dataroom", {
            data: { ...roomBody, code },
          }),
          200,
        );
        assert(accepted.viewId);
      },
    );
    const documentBody = {
      ...roomBody,
      documentId: document.id,
      documentVersionId: version.id,
      documentName: document.name,
      hasPages: true,
      viewType: "DOCUMENT_VIEW",
    };
    const view = await json(
      await guest.post("/api/views-dataroom", { data: documentBody }),
      200,
    );
    assert(view.viewId);
    const pageBody = {
      viewId: view.viewId,
      documentVersionId: version.id,
      pageNumbers: [1],
    };
    await check(
      "Before revocation, page refresh returns an actual accessible PNG",
      async () => {
        const response = await guest.post("/api/views/pages", {
          data: pageBody,
        });
        const data = await json(response, 200);
        assert.match(response.headers()["cache-control"], /no-store/);
        assert(data.pages?.length && loopback(data.pages[0].file));
        const file = await fetch(data.pages[0].file);
        assert(file.ok);
        assert.equal(
          Buffer.from(await file.arrayBuffer())
            .subarray(0, 8)
            .toString("hex"),
          "89504e470d0a1a0a",
        );
      },
    );
    await check(
      "Before revocation, the verified guest can request a real PDF download",
      async () => {
        const data = await json(
          await guest.post("/api/links/download/dataroom-document", {
            data: { linkId: link.id, documentId: document.id },
          }),
          200,
        );
        assert(loopback(data.downloadUrl));
        const response = await fetch(data.downloadUrl);
        assert(response.ok);
        assert.equal(
          Buffer.from(await response.arrayBuffer())
            .subarray(0, 5)
            .toString(),
          "%PDF-",
        );
      },
    );
    await check(
      "Revoke that same link through the owner API and confirm persisted state",
      async () => {
        const response = await owner.delete(`/api/links/${link.id}`);
        assert.equal(response.status(), 204);
        const stored = await prisma.link.findUnique({ where: { id: link.id } });
        assert(stored.deletedAt && stored.isArchived);
      },
    );
    for (const [name, endpoint, body] of [
      [
        "Revoked room access denies the established guest",
        "/api/views-dataroom",
        roomBody,
      ],
      [
        "Revoked document access denies the established guest",
        "/api/views-dataroom",
        documentBody,
      ],
      [
        "Revoked page refresh denies new signed page URLs",
        "/api/views/pages",
        pageBody,
      ],
      [
        "Revoked download denies a new signed original URL",
        "/api/links/download/dataroom-document",
        { linkId: link.id, documentId: document.id },
      ],
    ])
      await check(name, async () => {
        const response = await guest.post(endpoint, { data: body });
        assert([401, 403, 404].includes(response.status()));
        const data = await response.json();
        assert(!data.file && !data.pages && !data.downloadUrl);
        result.observedStatuses ??= {};
        result.observedStatuses[name] = response.status();
      });
  } catch (error) {
    result.failure = { errorType: error.name };
    process.exitCode = 1;
    console.error(
      `Page revocation replay failed (${error.name}); no credentials or URLs printed.`,
    );
  } finally {
    await owner?.dispose();
    await guest?.dispose();
    await prisma.$disconnect();
    fs.writeFileSync(
      path.join(runtimeDir, "page-revocation-results.json"),
      JSON.stringify(result, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `Page revocation: ${result.checks.filter((check) => check.status === "passed").length}/${result.checks.length} checks passed.`,
    );
  }
})();
