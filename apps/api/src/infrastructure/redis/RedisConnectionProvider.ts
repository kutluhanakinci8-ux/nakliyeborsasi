import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisConnectionProvider implements OnModuleDestroy {
  private readonly redisClient: Redis;

  public constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  public getClient(): Redis {
    return this.redisClient;
  }

  public async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }
}
