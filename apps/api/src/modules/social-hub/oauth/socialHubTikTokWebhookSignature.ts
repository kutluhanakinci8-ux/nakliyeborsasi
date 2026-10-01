import { createHmac, timingSafeEqual } from "crypto";

export function verifyTikTokWebhookSignature(params: {
  signatureHeader: string | undefined;
  rawBody: Buffer | undefined;
  secret: string | undefined;
}): boolean {
  const secret = params.secret?.trim();
  if (!secret) {
    return true;
  }
  if (!params.rawBody || !params.signatureHeader?.trim()) {
    return false;
  }
  const header = params.signatureHeader.trim();
  const expectedHex = createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");
  const candidates = [
    header,
    header.startsWith("sha256=") ? header.slice("sha256=".length) : header,
  ];
  for (const provided of candidates) {
    try {
      const a = Buffer.from(expectedHex, "hex");
      const b = Buffer.from(provided, "hex");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}
