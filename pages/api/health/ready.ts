import type { NextApiRequest, NextApiResponse } from "next";

import { getStorageConfig } from "@/ee/features/storage/config";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { timingSafeEqual } from "node:crypto";

import { getS3Client } from "@/lib/files/aws-client";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

async function bounded<T>(operation: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Readiness timed out.")),
          5000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Private dependency readiness; returns no credentials, URLs, or raw errors. */
export default async function ready(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const key = process.env.INTERNAL_API_KEY;
  const provided = req.headers.authorization;
  const expected = key ? `Bearer ${key}` : "";
  if (
    !key ||
    !provided ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return res.status(401).json({ error: "Unauthorized" });
  const checks = await Promise.allSettled([
    bounded(prisma.$queryRaw`SELECT 1`),
    bounded(redis.ping()),
    bounded(
      (async () => {
        const config = getStorageConfig();
        const client = getS3Client();
        try {
          await client.send(new HeadBucketCommand({ Bucket: config.bucket }), {
            abortSignal: AbortSignal.timeout(5000),
          });
        } finally {
          client.destroy();
        }
      })(),
    ),
  ]);
  const services = {
    database: checks[0].status === "fulfilled",
    redis: checks[1].status === "fulfilled",
    storage: checks[2].status === "fulfilled",
    emailConfigured: Boolean(
      process.env.RESEND_API_KEY && process.env.EMAIL_FROM,
    ),
    sessionConfigured: Boolean(process.env.NEXTAUTH_SECRET),
  };
  const complete = Object.values(services).every(Boolean);
  return res
    .status(complete ? 200 : 503)
    .json({
      status: complete ? "ready" : "not_ready",
      services,
      emailDeliveryVerified: false,
    });
}
