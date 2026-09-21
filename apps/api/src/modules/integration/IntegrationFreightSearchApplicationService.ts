import { Injectable } from "@nestjs/common";
import {
  ExternalFreightSearchCriteria,
  IntegrationProviderCode,
} from "@nakliyeborsasi/core";
import { ExternalFreightDataOrchestrator } from "./ExternalFreightDataOrchestrator";
import { AggregatedExternalFreightSearchResult } from "./AggregatedExternalFreightSearchResult";
import { IntegrationSearchCacheService } from "../../infrastructure/redis/IntegrationSearchCacheService";
import { IntegrationSearchRateLimitService } from "../../infrastructure/redis/IntegrationSearchRateLimitService";

@Injectable()
export class IntegrationFreightSearchApplicationService {
  public constructor(
    private readonly externalFreightDataOrchestrator: ExternalFreightDataOrchestrator,
    private readonly integrationSearchCacheService: IntegrationSearchCacheService,
    private readonly integrationSearchRateLimitService: IntegrationSearchRateLimitService,
  ) {}

  public async searchAggregatedOffers(
    companyId: string,
    criteria: ExternalFreightSearchCriteria,
    providerFilter: readonly IntegrationProviderCode[] | null,
  ): Promise<AggregatedExternalFreightSearchResult> {
    await this.integrationSearchRateLimitService.assertWithinLimit(companyId);
    const cacheKeySeed = this.integrationSearchCacheService.buildCacheKeySeed(
      criteria,
      providerFilter,
    );
    const cached = await this.integrationSearchCacheService.readCachedSearch(
      cacheKeySeed,
    );
    if (cached) {
      return cached;
    }
    const freshResult =
      await this.externalFreightDataOrchestrator.searchAllProviders(
        criteria,
        providerFilter,
      );
    await this.integrationSearchCacheService.writeCachedSearch(
      cacheKeySeed,
      freshResult,
    );
    return freshResult;
  }
}
