import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeographicMarketCode } from "@nakliyeborsasi/core";

@Injectable()
export class OsrmConfigurationService {
  public constructor(private readonly configService: ConfigService) {}

  public isRoutingEnabled(): boolean {
    return this.configService.get<string>("OSRM_DISABLED") !== "true";
  }

  public getDefaultBaseUrl(): string {
    return (
      this.configService.get<string>("OSRM_BASE_URL") ??
      "https://router.project-osrm.org"
    );
  }

  public getShardBaseUrl(marketCode: GeographicMarketCode): string {
    const key = `OSRM_BASE_URL_${marketCode}`;
    const override = this.configService.get<string>(key);
    if (override) {
      return override.replace(/\/$/, "");
    }
    return this.getDefaultBaseUrl().replace(/\/$/, "");
  }

  public getHttpTimeoutMs(): number {
    const raw = this.configService.get<string>("OSRM_HTTP_TIMEOUT_MS");
    const parsed = raw ? Number.parseInt(raw, 10) : 12_000;
    return Number.isFinite(parsed) ? parsed : 12_000;
  }

  public getMaxSegmentRoutePairsPerRequest(): number {
    return 24;
  }
}
