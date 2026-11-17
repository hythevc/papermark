#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const images = {
  postgres:
    "postgres@sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e",
  redis:
    "redis@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe",
  "redis-rest":
    "hiett/serverless-redis-http@sha256:5b0bb9239fce53abf87b2018a7a0deb9ec7bd900c5360738fe5fbeeb426f9150",
  s3: "chrislusf/seaweedfs@sha256:4b42c212543a0acd4c0e675215ecdcaf62a186ef98def76c7e12701871222d15",
  mailpit:
    "axllent/mailpit@sha256:aef2aacc11f075ec0fb6874275ee4a421e688e11a96ebb296134d1735c7761ce",
};
const args = process.argv.slice(2);
const action = args.shift();
const dirIndex = args.indexOf("--dir");
const runtimeDir = path.resolve(
  dirIndex >= 0
    ? args[dirIndex + 1]
    : process.env.ROOMLINE_RUNTIME_DIR ||
        path.join(os.tmpdir(), "roomline-runtime"),
);
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
if (
  !["start", "status", "stop"].includes(action) ||
  (dirIndex >= 0 && !args[dirIndex + 1])
) {
  console.log(
    "Usage: node scripts/runtime/services.mjs start|status|stop [--dir <private-directory-outside-checkout>] [--remove-data]\nCreates only isolated loopback Docker services. Credentials stay in mode600 files. Stop removes only labeled owned resources; --remove-data also removes their database/object volumes and credential files.",
  );
  process.exit(action === "--help" ? 0 : 1);
}
if (runtimeDir === repoRoot || runtimeDir.startsWith(repoRoot + path.sep))
  throw new Error("Runtime secrets must remain outside this checkout.");
fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
if (
  fs.realpathSync(runtimeDir) === fs.realpathSync(repoRoot) ||
  fs.realpathSync(runtimeDir).startsWith(fs.realpathSync(repoRoot) + path.sep)
)
  throw new Error("Runtime directory symlink resolves into the checkout.");
fs.chmodSync(runtimeDir, 0o700);
const manifest = path.join(runtimeDir, "owned-resources.json");
const privateFile = (name, content) => {
  fs.writeFileSync(path.join(runtimeDir, name), content, { mode: 0o600 });
  fs.chmodSync(path.join(runtimeDir, name), 0o600);
};
const environment = { ...process.env };
for (const name of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete environment[name];
function docker(args, optional = false) {
  try {
    return execFileSync(
      "docker",
      ["--host=unix:///var/run/docker.sock", ...args],
      {
        env: environment,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 8 * 1024 * 1024,
      },
    );
  } catch {
    if (optional) return null;
    throw new Error(
      "Owned Docker operation failed; inspect service status without printing environment or registry credentials.",
    );
  }
}
function inspect(kind, name) {
  const value = docker(
    [...(kind === "container" ? [] : [kind]), "inspect", name],
    true,
  );
  return value ? JSON.parse(value)[0] : null;
}
function assertOwned(kind, name, state) {
  const item = inspect(kind, name);
  if (item) {
    const labels = kind === "container" ? item.Config?.Labels : item.Labels;
    if (labels?.["roomline.owner"] !== state.owner)
      throw new Error(
        "Refusing to mutate a resource without the matching task ownership label.",
      );
  }
  return item;
}
function save(state) {
  privateFile("owned-resources.json", JSON.stringify(state, null, 2) + "\n");
}
function status(state) {
  if (!state) {
    console.log("No owned services recorded in this private directory.");
    return;
  }
  for (const name of state.containers) {
    const item = inspect("container", name);
    console.log(`${name}: ${item?.State?.Status || "absent"}`);
  }
  console.log("Published ports:", JSON.stringify(state.ports));
  console.log(
    "Readiness requires the service and integration checks; running containers alone are insufficient.",
  );
}
let state = fs.existsSync(manifest)
  ? JSON.parse(fs.readFileSync(manifest, "utf8"))
  : null;
if (state && !/^roomline-local-[a-z0-9-]+$/.test(state.owner))
  throw new Error("Invalid local service ownership record.");
if (action === "status") {
  status(state);
  process.exit(0);
}
if (action === "stop") {
  if (!state) {
    status(state);
    process.exit(0);
  }
  for (const name of state.containers)
    if (assertOwned("container", name, state)) docker(["rm", "-f", name]);
  if (assertOwned("network", state.network, state))
    docker(["network", "rm", state.network]);
  state.containers = [];
  save(state);
  if (args.includes("--remove-data")) {
    for (const name of state.volumes)
      if (assertOwned("volume", name, state)) docker(["volume", "rm", name]);
    for (const name of [
      ...new Set([
        ...state.credentialFiles,
        "owner-auth-state.json",
        "integration-fixtures.json",
      ]),
    ]) {
      if (path.basename(name) !== name)
        throw new Error("Unsafe private file name in ownership manifest.");
      fs.rmSync(path.join(runtimeDir, name), { force: true });
    }
    fs.rmSync(manifest, { force: true });
  }
  console.log("Only owned local resources were removed.");
  process.exit(0);
}
if (!state) {
  const ports = {
    postgres: 55432,
    redis: 56379,
    redis_rest: 58080,
    s3: 59000,
    smtp: 51025,
    mailpit: 58025,
  };
  for (const port of Object.values(ports))
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once("error", () =>
        reject(new Error("A selected loopback port is already occupied.")),
      );
      server.listen(port, "127.0.0.1", () => server.close(resolve));
    });
  const secret = () => crypto.randomBytes(32).toString("base64url");
  const owner =
      "roomline-local-" +
      Date.now() +
      "-" +
      crypto.randomBytes(3).toString("hex"),
    pgPassword = secret(),
    redisPassword = secret(),
    redisToken = secret(),
    accessKey = "roomline" + crypto.randomBytes(4).toString("hex"),
    secretKey = secret();
  state = {
    owner,
    network: owner + "-network",
    containers: [],
    volumes: [owner + "-postgres-data", owner + "-s3-data"],
    ports,
    images,
    credentialFiles: [
      "app.env",
      "postgres.env",
      "redis.env",
      "redis-rest.env",
      "s3.json",
    ],
  };
  const database = `postgresql://roomline_local:${pgPassword}@127.0.0.1:${ports.postgres}/roomline_runtime`;
  const app = {
    NODE_ENV: "development",
    ROOMLINE_LOCAL_INTEGRATION: "1",
    ROOMLINE_RUNTIME_DIR: runtimeDir,
    NEXTAUTH_SECRET: secret(),
    NEXTAUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
    NEXT_PUBLIC_MARKETING_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_BASE_HOST: "localhost:3000",
    POSTGRES_PRISMA_URL: database,
    POSTGRES_PRISMA_URL_NON_POOLING: database,
    POSTGRES_PRISMA_SHADOW_URL: database.replace(
      "/roomline_runtime",
      "/roomline_shadow",
    ),
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:58080",
    UPSTASH_REDIS_REST_TOKEN: redisToken,
    UPSTASH_REDIS_REST_LOCKER_URL: "http://127.0.0.1:58080",
    UPSTASH_REDIS_REST_LOCKER_TOKEN: redisToken,
    NEXT_PUBLIC_UPLOAD_TRANSPORT: "s3",
    NEXT_PRIVATE_UPLOAD_ENDPOINT: "http://127.0.0.1:59000",
    NEXT_PRIVATE_UPLOAD_REGION: "us-east-1",
    NEXT_PRIVATE_UPLOAD_BUCKET: "roomline-local-files",
    NEXT_PRIVATE_ARCHIVE_BUCKET: "roomline-local-archives",
    NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID: accessKey,
    NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY: secretKey,
    NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY: secret(),
    NEXT_PRIVATE_VERIFICATION_SECRET: secret(),
    INTERNAL_API_KEY: secret(),
    REVALIDATE_TOKEN: secret(),
    EMAIL_SERVER_HOST: "127.0.0.1",
    EMAIL_SERVER_PORT: "51025",
    EMAIL_FROM: "Roomline <noreply@roomline.test>",
  };
  privateFile(
    "app.env",
    Object.entries(app)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
  );
  privateFile(
    "postgres.env",
    `POSTGRES_USER=roomline_local\nPOSTGRES_PASSWORD=${pgPassword}\nPOSTGRES_DB=roomline_runtime\n`,
  );
  privateFile("redis.env", `ROOMLINE_REDIS_PASSWORD=${redisPassword}\n`);
  privateFile(
    "redis-rest.env",
    `SRH_MODE=env\nSRH_TOKEN=${redisToken}\nSRH_CONNECTION_STRING=redis://:${redisPassword}@${owner}-redis:6379\n`,
  );
  privateFile(
    "s3.json",
    JSON.stringify({
      identities: [
        {
          name: "roomline-local-admin",
          credentials: [{ accessKey, secretKey }],
          actions: ["Admin", "Read", "Write", "List", "Tagging"],
        },
      ],
    }),
  );
  save(state);
}
for (const [name, image] of Object.entries(images)) {
  if (!docker(["image", "inspect", image], true)) docker(["pull", image]);
  console.log(`Image ready: ${name}`);
}
if (!assertOwned("network", state.network, state))
  docker([
    "network",
    "create",
    "--label",
    "roomline.owner=" + state.owner,
    state.network,
  ]);
for (const name of state.volumes)
  if (!assertOwned("volume", name, state))
    docker([
      "volume",
      "create",
      "--label",
      "roomline.owner=" + state.owner,
      name,
    ]);
const owner = state.owner;
const configs = {
  postgres: {
    args: [
      "--memory",
      "512m",
      "-p",
      "127.0.0.1:55432:5432",
      "--env-file",
      path.join(runtimeDir, "postgres.env"),
      "-v",
      owner + "-postgres-data:/var/lib/postgresql/data",
    ],
    cmd: [],
  },
  redis: {
    args: [
      "--memory",
      "128m",
      "-p",
      "127.0.0.1:56379:6379",
      "--env-file",
      path.join(runtimeDir, "redis.env"),
    ],
    cmd: [
      "sh",
      "-c",
      'exec redis-server --requirepass "$ROOMLINE_REDIS_PASSWORD" --appendonly no',
    ],
  },
  "redis-rest": {
    args: [
      "--memory",
      "128m",
      "-p",
      "127.0.0.1:58080:80",
      "--env-file",
      path.join(runtimeDir, "redis-rest.env"),
    ],
    cmd: [],
  },
  s3: {
    args: [
      "--memory",
      "512m",
      "-p",
      "127.0.0.1:59000:8333",
      "-v",
      owner + "-s3-data:/data",
      "--mount",
      "type=bind,src=" +
        path.join(runtimeDir, "s3.json") +
        ",dst=/etc/roomline-s3.json,readonly",
    ],
    cmd: [
      "server",
      "-dir=/data",
      "-s3",
      "-s3.config=/etc/roomline-s3.json",
      "-master.volumeSizeLimitMB=32",
      "-volume.max=16",
    ],
  },
  mailpit: {
    args: [
      "--memory",
      "128m",
      "-p",
      "127.0.0.1:51025:1025",
      "-p",
      "127.0.0.1:58025:8025",
    ],
    cmd: [],
  },
};
for (const [name, { args: options, cmd }] of Object.entries(configs)) {
  const full = owner + "-" + name,
    item = assertOwned("container", full, state);
  if (item) {
    if (item.State.Status !== "running") docker(["start", full]);
  } else
    docker([
      "run",
      "-d",
      "--name",
      full,
      "--network",
      state.network,
      "--label",
      "roomline.owner=" + owner,
      "--restart",
      "no",
      ...options,
      images[name],
      ...cmd,
    ]);
  if (!state.containers.includes(full)) state.containers.push(full);
  save(state);
  console.log(`Owned service running: ${name}`);
}
console.log(
  "Private app.env prepared outside the checkout. Run migrations and actual health/integration checks before claiming readiness.",
);
