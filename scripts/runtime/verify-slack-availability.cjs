#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { request } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const runtimeDir =
  process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime";
const baseURL = process.env.NEXTAUTH_URL;
const local = (value) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
const database = new URL(process.env.POSTGRES_PRISMA_URL || "http://invalid");
if (
  process.env.NODE_ENV !== "development" ||
  process.env.ROOMLINE_LOCAL_INTEGRATION !== "1" ||
  !baseURL ||
  !local(baseURL) ||
  !local(database.href) ||
  database.pathname !== "/roomline_runtime"
)
  throw new Error("Isolated local integration mode required.");
const privateDir = fs.realpathSync(runtimeDir),
  root = fs.realpathSync(path.resolve(__dirname, "../.."));
if (privateDir === root || privateDir.startsWith(root + path.sep))
  throw new Error("Private state must remain outside the repository.");
const fixtures = JSON.parse(
  fs.readFileSync(path.join(runtimeDir, "integration-fixtures.json"), "utf8"),
);
const prisma = new PrismaClient();
const result = {
  checkedAt: new Date().toISOString(),
  mode: "real NextAuth session and isolated Postgres, no API/security mocks",
  checks: [],
  limitations: [
    "Slack is genuinely unconfigured in this environment. No Slack installation, provider delivery or configured remote-error path is certified.",
  ],
};
let owner, anonymous, team;
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
async function expect(response, status) {
  assert.equal(response.status(), status);
  return response.json();
}
(async () => {
  try {
    owner = await request.newContext({
      baseURL,
      timeout: 600000,
      storageState: path.join(runtimeDir, "owner-auth-state.json"),
    });
    anonymous = await request.newContext({ baseURL, timeout: 600000 });
    const session = await expect(await owner.get("/api/auth/session"), 200);
    assert.equal(session.user?.id, fixtures.users[0]);
    await check(
      "Retained workspace Slack GET returns explicit unavailable without a false installation",
      async () => {
        const data = await expect(
          await owner.get(`/api/teams/${fixtures.teams[0]}/integrations/slack`),
          200,
        );
        assert.equal(data.configured, false);
        assert.equal(data.integration, null);
        assert.equal(typeof data.message, "string");
      },
    );
    await check(
      "Unavailable Slack mutations return503 rather than provider or database success",
      async () => {
        const data = await expect(
          await owner.put(
            `/api/teams/${fixtures.teams[0]}/integrations/slack`,
            { data: { enabled: true } },
          ),
          503,
        );
        assert.equal(data.configured, false);
        assert(data.error);
      },
    );
    team = await prisma.team.create({
      data: {
        name: `Slack unavailable isolated ${Date.now()}`,
        users: {
          create: { userId: session.user.id, role: "ADMIN", status: "ACTIVE" },
        },
      },
    });
    const endpoint = `/api/teams/${team.id}/integrations/slack`;
    const identity = {
      userId_teamId: { userId: session.user.id, teamId: team.id },
    };
    await check(
      "Blocked and inactive memberships cannot read Slack integration status",
      async () => {
        await prisma.userTeam.update({
          where: identity,
          data: { blockedAt: new Date() },
        });
        await expect(await owner.get(endpoint), 403);
        await prisma.userTeam.update({
          where: identity,
          data: { blockedAt: null, status: "INVITED" },
        });
        await expect(await owner.get(endpoint), 403);
      },
    );
    await check(
      "Scoped members may read availability but cannot mutate team integration settings",
      async () => {
        await prisma.userTeam.update({
          where: identity,
          data: { status: "ACTIVE", role: "DATAROOM_MEMBER" },
        });
        const data = await expect(await owner.get(endpoint), 200);
        assert.equal(data.configured, false);
        await expect(
          await owner.put(endpoint, { data: { enabled: true } }),
          403,
        );
        await expect(await owner.delete(endpoint), 403);
        await expect(
          await owner.put(`${endpoint}/channels`, {
            data: { enabledChannels: {} },
          }),
          403,
        );
      },
    );
    await check(
      "Unauthenticated and foreign-workspace reads remain denied",
      async () => {
        await expect(await anonymous.get(endpoint), 401);
        await expect(
          await owner.get(`/api/teams/${fixtures.teams[1]}/integrations/slack`),
          403,
        );
      },
    );
  } catch (error) {
    result.failure = { errorType: error.name };
    process.exitCode = 1;
    console.error(
      `Slack availability replay failed (${error.name}); no secrets printed.`,
    );
  } finally {
    if (team) await prisma.team.deleteMany({ where: { id: team.id } });
    await owner?.dispose();
    await anonymous?.dispose();
    await prisma.$disconnect();
    fs.writeFileSync(
      path.join(runtimeDir, "slack-availability-results.json"),
      JSON.stringify(result, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(
      `Slack availability: ${result.checks.filter((item) => item.status === "passed").length}/${result.checks.length} checks passed; original fixture membership was unchanged.`,
    );
  }
})();
