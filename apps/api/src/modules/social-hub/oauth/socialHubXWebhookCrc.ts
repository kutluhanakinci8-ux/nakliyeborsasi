import { createHmac } from "crypto";

/** Account Activity API CRC challenge (HMAC-SHA256, base64). */
export function buildXWebhookCrcResponse(
  crcToken: string,
  consumerSecret: string,
): string {
  return createHmac("sha256", consumerSecret)
    .update(crcToken)
    .digest("base64");
}
