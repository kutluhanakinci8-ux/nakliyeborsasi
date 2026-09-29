import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ValidationException } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";

@Injectable()
export class MessagingCompanyMessageRateLimitService {
  private readonly memoryCounts = new Map<string, number>();

  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
    private readonly configService: ConfigService,
  ) {}

  public async assertWithinLimit(companyId: string): Promise<void> {
    const limit = Number(
      this.configService.get<string>("MESSAGING_RATE_LIMIT_PER_MINUTE") ??
        "120",
    );
    const bucket = this.currentMinuteBucket();
    const key = `messaging:rate:${companyId}:${bucket}`;

    try {
      const redisClient = this.redisConnectionProvider.getClient();
      const currentCount = await redisClient.incr(key);
      if (currentCount === 1) {
        await redisClient.expire(key, 90);
      }
      if (currentCount > limit) {
        throw new ValidationException(
          "Mesaj gönderim limiti aşıldı. Lütfen bir dakika bekleyin.",
        );
      }
      return;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }
    }

    const memKey = `${companyId}:${bucket}`;
    const next = (this.memoryCounts.get(memKey) ?? 0) + 1;
    this.memoryCounts.set(memKey, next);
    if (next > limit) {
      throw new ValidationException(
        "Mesaj gönderim limiti aşıldı. Lütfen bir dakika bekleyin.",
      );
    }
  }

  private currentMinuteBucket(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
  }
}
