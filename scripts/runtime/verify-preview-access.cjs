#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { request } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const runtimeDir =
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime";
const baseURL = process.env.NEXTAUTH_URL;
const loopback = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
if (
  process.env.NODE_ENV !== "development" ||
  process.env.ROOMLINE_LOCAL_INTEGRATION !== "1" ||
  !baseURL ||
  !loopback(baseURL) ||
  !loopback(database.href) ||
  database.pathname !== "/roomline_runtime"
)
  throw new Error("Isolated local integration mode is required.");
const privateDir = fs.realpathSync(runtimeDir),
  repoRoot = fs.realpathSync(path.resolve(__dirname, "../.."));
if (privateDir === repoRoot || privateDir.startsWith(repoRoot + path.sep))
  throw new Error("Private state must remain outside the checkout.");
const fixtures = JSON.parse(
  fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8"),
);
const prisma = new PrismaClient();
const result = {
  checkedAt: new Date().toISOString(),
  mode: "real NextAuth owner session, PostgreSQL/Redis and initial signed-page APIs; no auth/permission mocks",
  checks: [],
  limitations: [
    "Test-only links and one foreign room are seeded in the isolated database; this replay does not retest room/link creation UX.",
    "Previously issued storage URLs retain their TTL; this verifies authorization for issuing new URLs.",
  ],
};
const createdLinks = [];
let owner,
  membership,
  membershipChanged = false,
  assignmentCreated = false,
  foreignRoom;
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
async function accepted(response, expected = 200) {
  assert.equal(response.status(), expected);
  return response.json();
}
async function denied(response) {
  assert([401, 403, 404].includes(response.status()));
  const data = await response.json();
  assert(!data.file && !data.pages && !data.previewToken && !data.downloadUrl);
  return response.status();
}
async function token(linkId) {
  const data = await accepted(await owner.post(`/api/links/${linkId}/preview`));
  assert(data.previewToken);
  return data.previewToken;
}
async function restoreMembership() {
  if (!membership || !membershipChanged) return;
  const { notificationPreferences, ...data } = membership;
  if (notificationPreferences !== null)
    data.notificationPreferences = notificationPreferences;
  await prisma.userTeam.upsert({
    where: {
      userId_teamId: { userId: membership.userId, teamId: membership.teamId },
    },
    create: data,
    update: data,
  });
  membershipChanged = false;
}
(async () => {
  try {
    owner = await request.newContext({
      baseURL,
      timeout: 600000,
      storageState: path.join(runtimeDir, "owner-auth-state.json"),
    });
    const session = await accepted(await owner.get("/api/auth/session"));
    assert.equal(session.user?.id, fixtures.users[0]);
    const userId = session.user.id,
      teamId = fixtures.teams[0];
    membership = await prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    assert(membership?.status === "ACTIVE" && !membership.blockedAt);
    const room = await prisma.dataroom.findFirst({
      where: { id: fixtures.rooms[0], teamId },
    });
    assert(room);
    const attached = await prisma.dataroomDocument.findFirst({
      where: { dataroomId: room.id },
      include: {
        document: {
          include: {
            versions: { where: { isPrimary: true }, include: { pages: true } },
          },
        },
      },
    });
    const document = attached?.document,
      version = document?.versions[0];
    assert(version?.pages.length);
    const createLink = async (data) => {
      const link = await prisma.link.create({
        data: {
          allowList: [],
          denyList: [],
          emailProtected: true,
          emailAuthenticated: true,
          enableNotification: false,
          ...data,
        },
      });
      createdLinks.push(link.id);
      return link;
    };
    const roomLink = await createLink({
      teamId,
      dataroomId: room.id,
      linkType: "DATAROOM_LINK",
      ownerId: userId,
    });
    const documentLink = await createLink({
      teamId,
      documentId: document.id,
      linkType: "DOCUMENT_LINK",
      ownerId: userId,
    });
    foreignRoom = await prisma.dataroom.create({
      data: {
        teamId: fixtures.teams[1],
        pId: `dr_preview_${Date.now()}`,
        name: "Preview access isolated negative fixture",
      },
    });
    const foreignLink = await createLink({
      teamId: fixtures.teams[1],
      dataroomId: foreignRoom.id,
      linkType: "DATAROOM_LINK",
      ownerId: fixtures.users[1],
    });
    const roomBody = {
      linkId: roomLink.id,
      dataroomId: room.id,
      linkType: "DATAROOM_LINK",
      viewType: "DOCUMENT_VIEW",
      documentId: document.id,
      documentVersionId: version.id,
      documentName: document.name,
      hasPages: true,
      userId,
      ownerId: userId,
    };
    const documentBody = {
      linkId: documentLink.id,
      documentVersionId: version.id,
      documentName: document.name,
      hasPages: true,
      userId,
      ownerId: userId,
    };
    const pageBody = (linkId, previewToken) => ({
      linkId,
      previewToken,
      documentVersionId: version.id,
      pageNumbers: [1],
    });
    const ownerTokens = await check(
      "Active owner can obtain real preview tokens for room and document links",
      async () => ({
        room: await token(roomLink.id),
        document: await token(documentLink.id),
      }),
    );
    await check(
      "Active owner initial room and document previews return actual PNG page bytes",
      async () => {
        for (const [endpoint, body, previewToken] of [
          ["/api/views-dataroom", roomBody, ownerTokens.room],
          ["/api/views", documentBody, ownerTokens.document],
        ]) {
          const data = await accepted(
            await owner.post(endpoint, { data: { ...body, previewToken } }),
          );
          assert(
            data.isPreview &&
              data.pages?.length &&
              loopback(data.pages[0].file),
          );
          const file = await fetch(data.pages[0].file);
          assert(file.ok);
          assert.equal(
            Buffer.from(await file.arrayBuffer())
              .subarray(0, 8)
              .toString("hex"),
            "89504e470d0a1a0a",
          );
        }
        await accepted(
          await owner.post("/api/views/pages", {
            data: pageBody(roomLink.id, ownerTokens.room),
          }),
        );
      },
    );
    await check(
      "A signed-in outsider cannot obtain a preview token for a foreign workspace",
      async () => {
        assert.equal(
          await denied(
            await owner.post(`/api/links/${foreignLink.id}/preview`),
          ),
          403,
        );
      },
    );
    await check(
      "A caller-supplied userId cannot replace token verification on either initial-view route",
      async () => {
        for (const [endpoint, body] of [
          ["/api/views-dataroom", roomBody],
          ["/api/views", documentBody],
        ])
          await denied(
            await owner.post(endpoint, {
              data: { ...body, previewToken: "invalid-local-negative-control" },
            }),
          );
      },
    );
    // Warm all positive routes before the brief membership mutation window.
    await check(
      "Blocked membership denies new preview-token issuance",
      async () => {
        membershipChanged = true;
        await prisma.userTeam.update({
          where: { userId_teamId: { userId, teamId } },
          data: { blockedAt: new Date() },
        });
        try {
          await denied(await owner.post(`/api/links/${roomLink.id}/preview`));
        } finally {
          await restoreMembership();
        }
      },
    );
    await check(
      "Removing membership invalidates previously issued room, document and page previews",
      async () => {
        const roomToken = await token(roomLink.id),
          documentToken = await token(documentLink.id);
        membershipChanged = true;
        await prisma.userTeam.delete({
          where: { userId_teamId: { userId, teamId } },
        });
        try {
          await denied(await owner.post(`/api/links/${roomLink.id}/preview`));
          await denied(
            await owner.post("/api/views-dataroom", {
              data: { ...roomBody, previewToken: roomToken },
            }),
          );
          await denied(
            await owner.post("/api/views", {
              data: { ...documentBody, previewToken: documentToken },
            }),
          );
          await denied(
            await owner.post("/api/views/pages", {
              data: pageBody(roomLink.id, roomToken),
            }),
          );
        } finally {
          await restoreMembership();
        }
      },
    );
    await check(
      "Scoped room assignment permits preview, then its removal revokes existing tokens",
      async () => {
        const existing = await prisma.userDataroom.findUnique({
          where: { userId_dataroomId: { userId, dataroomId: room.id } },
        });
        assert(
          !existing,
          "This replay requires an unassigned owned fixture before its temporary scoped-role check.",
        );
        await prisma.userDataroom.create({
          data: { userId, teamId, dataroomId: room.id },
        });
        assignmentCreated = true;
        membershipChanged = true;
        await prisma.userTeam.update({
          where: { userId_teamId: { userId, teamId } },
          data: { role: "DATAROOM_MEMBER" },
        });
        try {
          const roomToken = await token(roomLink.id),
            documentToken = await token(documentLink.id);
          await accepted(
            await owner.post("/api/views/pages", {
              data: pageBody(roomLink.id, roomToken),
            }),
          );
          await prisma.userDataroom.delete({
            where: { userId_dataroomId: { userId, dataroomId: room.id } },
          });
          assignmentCreated = false;
          await denied(await owner.post(`/api/links/${roomLink.id}/preview`));
          await denied(
            await owner.post("/api/views-dataroom", {
              data: { ...roomBody, previewToken: roomToken },
            }),
          );
          await denied(
            await owner.post("/api/views", {
              data: { ...documentBody, previewToken: documentToken },
            }),
          );
        } finally {
          await restoreMembership();
        }
      },
    );
    await check(
      "Original owner membership is restored and a fresh owner preview succeeds",
      async () => {
        const current = await prisma.userTeam.findUnique({
          where: { userId_teamId: { userId, teamId } },
        });
        assert.equal(current.role, membership.role);
        assert.equal(current.status, membership.status);
        assert.equal(current.blockedAt, null);
        await token(roomLink.id);
        result.membershipRestored = true;
      },
    );
  } catch (error) {
    result.failure = {
      errorType: error.name,
      contract: error.message?.match(
        /Unknown argument `[^`]+`|Argument `[^`]+` is missing|Invalid value for argument `[^`]+`/g,
      ),
    };
    process.exitCode = 1;
    console.error(
      `Preview replay failed (${error.name}); no tokens or URLs printed.`,
    );
  } finally {
    await restoreMembership();
    if (assignmentCreated && membership)
      await prisma.userDataroom.deleteMany({
        where: { userId: membership.userId, dataroomId: fixtures.rooms[0] },
      });
    await prisma.link.deleteMany({ where: { id: { in: createdLinks } } });
    if (foreignRoom)
      await prisma.dataroom.deleteMany({ where: { id: foreignRoom.id } });
    await owner?.dispose();
    await prisma.$disconnect();
    fs.writeFileSync(
      path.join(runtimeDir, "preview-access-results.json"),
      JSON.stringify(result, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `Preview access: ${result.checks.filter((check) => check.status === "passed").length}/${result.checks.length} checks passed; fixture membership restored.`,
    );
  }
})();
