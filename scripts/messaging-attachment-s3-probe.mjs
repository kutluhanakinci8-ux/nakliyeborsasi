#!/usr/bin/env node
/**
 * VPS doğrulama: MESSAGING_ATTACHMENT_S3_BUCKET tanımlıysa head + yaz/oku/sil probe.
 * Kullanım: scripts/verify-messaging-attachment-s3.sh
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

function resolveConfig() {
  const bucket = process.env.MESSAGING_ATTACHMENT_S3_BUCKET?.trim();
  if (!bucket) {
    return null;
  }
  const region =
    process.env.MESSAGING_ATTACHMENT_S3_REGION?.trim() ??
    process.env.AWS_REGION?.trim() ??
    process.env.AWS_DEFAULT_REGION?.trim() ??
    "eu-central-1";
  const endpoint = process.env.MESSAGING_ATTACHMENT_S3_ENDPOINT?.trim() ?? undefined;
  const forcePathStyle =
    process.env.MESSAGING_ATTACHMENT_S3_FORCE_PATH_STYLE === "1";
  return { bucket, region, endpoint, forcePathStyle };
}

async function main() {
  const config = resolveConfig();
  if (!config) {
    console.log(
      "SKIP: MESSAGING_ATTACHMENT_S3_BUCKET not set (yerel ≤10 MB/ek)",
    );
    process.exit(0);
  }
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
  });
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  const key = `probe/messaging-attachment/${randomUUID()}.txt`;
  const body = "lerta-messaging-attachment-probe";
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  const got = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  const chunks = [];
  for await (const chunk of got.Body) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text !== body) {
    throw new Error("S3 probe read mismatch");
  }
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  console.log(`OK: S3 probe ${config.bucket} (${config.region})`);
}

main().catch((error) => {
  console.error(
    `FAIL: S3 probe — ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
});
