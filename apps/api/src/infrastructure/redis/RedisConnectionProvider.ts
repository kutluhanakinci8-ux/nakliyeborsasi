import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisConnectionProvider implements OnModuleDestroy {
  private readonly redisUrl: string;

  private readonly redisClient: Redis;

  public constructor(configService: ConfigService) {
    this.redisUrl =
      configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    this.redisClient = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  public getClient(): Redis {
    return this.redisClient;
  }

  /** Ayrı bağlantı: SUBSCRIBE duplicate() + enableOfflineQueue:false ile hata veriyordu. */
  public createSubscriberClient(): Redis {
    return new Redis(this.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }
}
