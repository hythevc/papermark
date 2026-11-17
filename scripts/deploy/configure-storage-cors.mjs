import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

// Opt in only on the newly provisioned, identified staging project/bucket.
// No credential value is printed, and the helper never makes a bucket public.
if (process.env.ROOMLINE_CONFIGURE_BUCKET_CORS !== "1") {
  console.log("Storage CORS setup was not requested.");
} else {
  const required = (name) => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing deployment configuration: ${name}`);
    return value;
  };
  if (required("RAILWAY_ENVIRONMENT_NAME") !== "staging") {
    throw new Error("Storage CORS setup is restricted to the staging environment.");
  }
  if (required("RAILWAY_PROJECT_ID") !== required("ROOMLINE_MANAGED_PROJECT_ID")) {
    throw new Error("Storage CORS setup project does not match the reviewed target.");
  }
  const bucket = required("NEXT_PRIVATE_UPLOAD_BUCKET");
  if (bucket !== required("ROOMLINE_MANAGED_BUCKET_NAME")) {
    throw new Error("Storage CORS setup bucket does not match the reviewed target.");
  }
  const endpoint = new URL(required("NEXT_PRIVATE_UPLOAD_ENDPOINT"));
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    throw new Error("Storage CORS setup requires an HTTPS storage endpoint.");
  }
  const client = new S3Client({
    endpoint: endpoint.href,
    region: required("NEXT_PRIVATE_UPLOAD_REGION"),
    credentials: {
      accessKeyId: required("NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID"),
      secretAccessKey: required("NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY"),
    },
  });
  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
          MaxAgeSeconds: 300,
        }],
      },
    }));
    console.log("Configured signed-read CORS on the reviewed staging bucket.");
  } finally {
    client.destroy();
  }
}
