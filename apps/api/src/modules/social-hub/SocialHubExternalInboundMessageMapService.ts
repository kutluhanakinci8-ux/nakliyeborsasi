import { Injectable, Logger } from "@nestjs/common";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";

const KEY_PREFIX = "social:inbound-msg:";
const TTL_SECONDS = 60 * 60 * 24 * 120;

@Injectable()
export class SocialHubExternalInboundMessageMapService {
  private readonly logger = new Logger(
    SocialHubExternalInboundMessageMapService.name,
  );
  private readonly memory = new Map<string, string>();

  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
  ) {}

  public async remember(params: {
    platformCode: string;
    companyId: string;
    threadId: string;
    externalMessageId: string;
    messageId: string;
  }): Promise<void> {
    const key = this.buildKey(params);
    this.memory.set(key, params.messageId);
    try {
      const client = this.redisConnectionProvider.getClient();
      await client.set(key, params.messageId, "EX", TTL_SECONDS);
    } catch (error) {
      this.logger.debug(
        `Inbound map Redis unavailable: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
    }
  }

  public async resolveMessageId(params: {
    platformCode: string;
    companyId: string;
    threadId: string;
    externalMessageId: string;
  }): Promise<string | null> {
    const key = this.buildKey(params);
    const cached = this.memory.get(key);
    if (cached) {
      return cached;
    }
    try {
      const client = this.redisConnectionProvider.getClient();
      const raw = await client.get(key);
      if (raw?.trim()) {
        this.memory.set(key, raw);
        return raw;
      }
    } catch {
      // fall through
    }
    return null;
  }

  private buildKey(params: {
    platformCode: string;
    companyId: string;
    threadId: string;
    externalMessageId: string;
  }): string {
    return `${KEY_PREFIX}${params.platformCode}:${params.companyId}:${params.threadId}:${params.externalMessageId}`;
  }
}
