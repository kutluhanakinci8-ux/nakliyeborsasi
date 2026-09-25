import { createHash, createHmac, randomBytes } from "node:crypto";

export function hashIntegrationSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateApiKeyPlaintext(): { plaintext: string; prefix: string } {
  const token = randomBytes(24).toString("base64url");
  const plaintext = `lerta_mail_live_${token}`;
  return { plaintext, prefix: plaintext.slice(0, 16) };
}

export function generateWebhookSigningSecret(): {
  plaintext: string;
  prefix: string;
} {
  const token = randomBytes(24).toString("base64url");
  const plaintext = `whsec_${token}`;
  return { plaintext, prefix: plaintext.slice(0, 12) };
}

export function signWebhookPayload(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}
