#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Redis } = require("@upstash/redis");
const { Ratelimit } = require("@upstash/ratelimit");
const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const runtimeDir = process.env.ROOMLINE_RUNTIME_DIR || "/workspace/scratch/roomline-runtime";
const mailURL = process.env.ROOMLINE_MAILPIT_URL || "http://127.0.0.1:58025";
if (
  process.env.NODE_ENV !== "development" ||
  process.env.ROOMLINE_LOCAL_INTEGRATION !== "1" ||
  ![
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
    mailURL,
  ].every((value) =>
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname),
  )
)
  throw new Error(
    "Explicit local integration mode and loopback services are required.",
  );
fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
const repoRoot = fs.realpathSync(path.resolve(__dirname, "../.."));
const realRuntimeDir = fs.realpathSync(runtimeDir);
if (realRuntimeDir === repoRoot || realRuntimeDir.startsWith(repoRoot + path.sep))
  throw new Error("Keep runtime files outside the checkout.");
fs.chmodSync(runtimeDir, 0o700);
const runId = crypto.randomUUID();
const output = { checkedAt: new Date().toISOString(), checks: [] };
async function check(name, fn) {
  try {
    await fn();
    output.checks.push({ name, status: "passed" });
    console.log(name + ": passed");
  } catch (e) {
    output.checks.push({
      name,
      status: "failed",
      errorType: e.name,
      httpStatus: e.$metadata?.httpStatusCode,
    });
    console.log(name + ": failed (" + e.name + ")");
  }
}
(async () => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  await check("Redis real SET/GETDEL single use", async () => {
    const key = "roomline:integration:redis-health:" + runId;
    await redis.set(key, { value: "isolated" }, { ex: 60 });
    const a = await redis.getdel(key),
      b = await redis.getdel(key);
    if (a?.value !== "isolated" || b !== null)
      throw new Error("RedisContractMismatch");
  });
  await check("Redis sliding-window enforcement", async () => {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1 m"),
      prefix: "roomline:integration:health:" + runId,
    });
    const a = await limiter.limit("local"),
      b = await limiter.limit("local");
    if (!a.success || b.success) throw new Error("RatelimitContractMismatch");
  });
  await check("Redis REST rejects absent token", async () => {
    const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(["PING"]),
    });
    const d = await r.json();
    if (
      r.status < 400 ||
      r.status >= 500 ||
      !d.error ||
      Object.hasOwn(d, "result")
    )
      throw new Error("UnexpectedRedisAnonymousAccess");
  });
  const config = {
    endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
    region: process.env.NEXT_PRIVATE_UPLOAD_REGION,
    credentials: {
      accessKeyId: process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY,
    },
  };
  const s3 = new S3Client(config);
  await check("S3 create private test buckets", async () => {
    for (const Bucket of [
      process.env.NEXT_PRIVATE_UPLOAD_BUCKET,
      process.env.NEXT_PRIVATE_ARCHIVE_BUCKET,
    ]) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket }));
      } catch (e) {
        if (
          !["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(e.name)
        )
          throw e;
      }
    }
  });
  const key = "integration-health/" + runId + ".txt",
    Bucket = process.env.NEXT_PRIVATE_UPLOAD_BUCKET;
  await check("S3 real upload and byte-identical read", async () => {
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: "Roomline local storage verification\n",
        ContentType: "text/plain",
      }),
    );
    const r = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    if (
      (await r.Body.transformToString()) !==
      "Roomline local storage verification\n"
    )
      throw new Error("ObjectMismatch");
  });
  await check("S3 rejects anonymous object read", async () => {
    const r = await fetch(config.endpoint + "/" + Bucket + "/" + key);
    if (r.status !== 403) throw new Error("UnexpectedAnonymousAccess");
  });
  await check("S3 rejects incorrect credentials", async () => {
    const bad = new S3Client({
      ...config,
      credentials: {
        accessKeyId: "invalid-local-key",
        secretAccessKey: "invalid-local-secret",
      },
    });
    try {
      await bad.send(new GetObjectCommand({ Bucket, Key: key }));
      throw new Error("UnexpectedWrongKeyAccess");
    } catch (e) {
      if (e.$metadata?.httpStatusCode !== 403) throw e;
    }
  });
  await check("S3 remove owned health object", () =>
    s3.send(new DeleteObjectCommand({ Bucket, Key: key })),
  );
  await check("Mailpit local HTTP API", async () => {
    const r = await fetch(
      mailURL + "/api/v1/messages",
    );
    if (!r.ok) throw new Error("MailpitNotReady");
    const d = await r.json();
    if (!Array.isArray(d.messages))
      throw new Error("UnexpectedMailpitResponse");
  });
  fs.writeFileSync(
    path.join(runtimeDir, "service-health.json"),
    JSON.stringify(output, null, 2) + "\n",
    { mode: 0o600 },
  );
  if (output.checks.some((x) => x.status !== "passed")) process.exitCode = 1;
})().catch((e) => {
  console.error("Health harness failed:", e.name);
  process.exitCode = 1;
});
