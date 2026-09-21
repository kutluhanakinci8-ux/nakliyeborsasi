import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ValidationException } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "./RedisConnectionProvider";

@Injectable()
export class IntegrationSearchRateLimitService {
  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
    private readonly configService: ConfigService,
  ) {}

  public async assertWithinLimit(companyId: string): Promise<void> {
    const limit = Number(
      this.configService.get<string>("INTEGRATION_RATE_LIMIT_PER_MINUTE") ??
        "30",
    );
    const redisClient = this.redisConnectionProvider.getClient();
    const key = `integration:rate:${companyId}:${this.currentMinuteBucket()}`;
    const currentCount = await redisClient.incr(key);
    if (currentCount === 1) {
      await redisClient.expire(key, 60);
    }
    if (currentCount > limit) {
      throw new ValidationException("Integration rate limit exceeded");
    }
  }

  private currentMinuteBucket(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
  }
}
