import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

@Injectable()
export class EmailTrackingSignatureService {
  public constructor(private readonly configService: ConfigService) {}

  public signOpenToken(outboxId: string): string {
    const sig = this.sign(outboxId);
    return `${outboxId}.${sig}`;
  }

  public verifyOpenToken(token: string): string | null {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }
    const [outboxId, sig] = parts;
    if (!outboxId || !sig) {
      return null;
    }
    const expected = this.sign(outboxId);
    if (!this.safeEqual(sig, expected)) {
      return null;
    }
    return outboxId;
  }

  private sign(payload: string): string {
    const secret = this.resolveSecret();
    return createHmac("sha256", secret).update(payload).digest("base64url");
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  private resolveSecret(): string {
    return (
      this.configService.get<string>("EMAIL_TRACKING_SECRET") ??
      this.configService.get<string>("JWT_ACCESS_SECRET") ??
      "lerta-email-tracking-dev-only"
    );
  }
}
