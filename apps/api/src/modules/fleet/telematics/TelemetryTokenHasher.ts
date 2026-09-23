import { createHash, randomBytes } from "node:crypto";

export class TelemetryTokenHasher {
  public static generateIngestToken(): string {
    return randomBytes(32).toString("base64url");
  }

  public static hashIngestToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  public static hashClientIp(ip: string | undefined): string | null {
    if (!ip) {
      return null;
    }
    return createHash("sha256").update(ip.trim(), "utf8").digest("hex").slice(0, 32);
  }
}
