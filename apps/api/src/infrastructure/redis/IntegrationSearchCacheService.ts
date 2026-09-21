import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { ExternalFreightSearchCriteria } from "@nakliyeborsasi/core";
import { AggregatedExternalFreightSearchResult } from "../../modules/integration/AggregatedExternalFreightSearchResult";
import { RedisConnectionProvider } from "./RedisConnectionProvider";

@Injectable()
export class IntegrationSearchCacheService {
  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
    private readonly configService: ConfigService,
  ) {}

  public async readCachedSearch(
    cacheKeySeed: string,
  ): Promise<AggregatedExternalFreightSearchResult | null> {
    const redisClient = this.redisConnectionProvider.getClient();
    const cachedPayload = await redisClient.get(this.buildCacheKey(cacheKeySeed));
    if (!cachedPayload) {
      return null;
    }
    return JSON.parse(cachedPayload) as AggregatedExternalFreightSearchResult;
  }

  public async writeCachedSearch(
    cacheKeySeed: string,
    result: AggregatedExternalFreightSearchResult,
  ): Promise<void> {
    const ttlSeconds = Number(
      this.configService.get<string>("INTEGRATION_CACHE_TTL_SECONDS") ?? "120",
    );
    const redisClient = this.redisConnectionProvider.getClient();
    await redisClient.set(
      this.buildCacheKey(cacheKeySeed),
      JSON.stringify(result),
      "EX",
      ttlSeconds,
    );
  }

  public buildCacheKeySeed(
    criteria: ExternalFreightSearchCriteria,
    providerFilter: readonly string[] | null,
  ): string {
    const serialized = JSON.stringify({ criteria, providerFilter });
    return createHash("sha256").update(serialized).digest("hex");
  }

  private buildCacheKey(cacheKeySeed: string): string {
    return `integration:freight-search:${cacheKeySeed}`;
  }
}
