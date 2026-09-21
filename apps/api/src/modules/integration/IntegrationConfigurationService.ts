import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";

@Injectable()
export class IntegrationConfigurationService {
  public constructor(private readonly configService: ConfigService) {}

  public getHttpTimeoutMilliseconds(): number {
    return Number(
      this.configService.get<string>("INTEGRATION_HTTP_TIMEOUT_MS") ?? "8000",
    );
  }

  public getProviderBaseUrl(environmentKey: string): string | null {
    const value = this.configService.get<string>(environmentKey);
    if (!value || value.trim().length === 0) {
      return null;
    }
    return value.replace(/\/$/, "");
  }

  public buildPayloadDigest(payload: unknown): string {
    const serialized = JSON.stringify(payload);
    return createHash("sha256").update(serialized).digest("hex");
  }
}
