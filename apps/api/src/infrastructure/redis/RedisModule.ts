import { Module } from "@nestjs/common";
import { RedisConnectionProvider } from "./RedisConnectionProvider";
import { IntegrationSearchCacheService } from "./IntegrationSearchCacheService";
import { IntegrationSearchRateLimitService } from "./IntegrationSearchRateLimitService";

@Module({
  providers: [
    RedisConnectionProvider,
    IntegrationSearchCacheService,
    IntegrationSearchRateLimitService,
  ],
  exports: [
    RedisConnectionProvider,
    IntegrationSearchCacheService,
    IntegrationSearchRateLimitService,
  ],
})
export class RedisModule {}
