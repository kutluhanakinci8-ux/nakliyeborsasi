import { Injectable, Logger } from "@nestjs/common";
import { RedisConnectionProvider } from "../../../infrastructure/redis/RedisConnectionProvider";
import {
  mergeTelegramMediaGroupPart,
  type TelegramMediaGroupBufferState,
} from "./socialHubTelegramMediaGroupTypes";
import type { TelegramParsedMedia } from "./socialHubTelegramWebhookParser";

const REDIS_KEY_PREFIX = "social:telegram:mg:";
const FLUSH_DELAY_MS = 2_000;
const BUFFER_TTL_SECONDS = 30;

export type TelegramMediaGroupPart = {
  connectionId: string;
  companyId: string;
  mediaGroupId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  media: TelegramParsedMedia[];
  externalMessageId: string;
};

@Injectable()
export class SocialHubTelegramMediaGroupBufferService {
  private readonly logger = new Logger(SocialHubTelegramMediaGroupBufferService.name);
  private readonly memoryBuffers = new Map<string, TelegramMediaGroupBufferState>();
  private readonly memoryTimers = new Map<string, NodeJS.Timeout>();

  public constructor(
    private readonly redisConnectionProvider: RedisConnectionProvider,
  ) {}

  public async enqueue(
    part: TelegramMediaGroupPart,
    flush: (merged: TelegramMediaGroupBufferState) => Promise<void>,
  ): Promise<void> {
    const bufferKey = `${part.connectionId}:${part.mediaGroupId}`;
    const redisKey = `${REDIS_KEY_PREFIX}${bufferKey}`;

    let merged: TelegramMediaGroupBufferState | null = null;
    try {
      const client = this.redisConnectionProvider.getClient();
      const raw = await client.get(redisKey);
      const existing = raw
        ? (JSON.parse(raw) as TelegramMediaGroupBufferState)
        : null;
      merged = mergeTelegramMediaGroupPart(existing, part);
      await client.set(
        redisKey,
        JSON.stringify(merged),
        "EX",
        BUFFER_TTL_SECONDS,
      );
      await this.scheduleRedisFlush(bufferKey, redisKey, flush);
      return;
    } catch (error) {
      this.logger.debug(
        `Telegram media group Redis buffer fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    merged = mergeTelegramMediaGroupPart(
      this.memoryBuffers.get(bufferKey) ?? null,
      part,
    );
    this.memoryBuffers.set(bufferKey, merged);
    const existingTimer = this.memoryTimers.get(bufferKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.memoryTimers.set(
      bufferKey,
      setTimeout(() => {
        void this.flushMemory(bufferKey, flush);
      }, FLUSH_DELAY_MS),
    );
  }

  private async scheduleRedisFlush(
    bufferKey: string,
    redisKey: string,
    flush: (merged: TelegramMediaGroupBufferState) => Promise<void>,
  ): Promise<void> {
    const lockKey = `${redisKey}:flush`;
    const client = this.redisConnectionProvider.getClient();
    const acquired = await client.set(lockKey, "1", "PX", FLUSH_DELAY_MS, "NX");
    if (acquired !== "OK") {
      return;
    }
    setTimeout(() => {
      void this.flushRedis(bufferKey, redisKey, lockKey, flush);
    }, FLUSH_DELAY_MS);
  }

  private async flushRedis(
    bufferKey: string,
    redisKey: string,
    lockKey: string,
    flush: (merged: TelegramMediaGroupBufferState) => Promise<void>,
  ): Promise<void> {
    try {
      const client = this.redisConnectionProvider.getClient();
      const raw = await client.get(redisKey);
      if (!raw) {
        return;
      }
      await client.del(redisKey);
      const merged = JSON.parse(raw) as TelegramMediaGroupBufferState;
      await flush(merged);
    } catch (error) {
      this.logger.warn(
        `Telegram media group flush failed key=${bufferKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      try {
        await this.redisConnectionProvider.getClient().del(lockKey);
      } catch {
        // ignore
      }
    }
  }

  private async flushMemory(
    bufferKey: string,
    flush: (merged: TelegramMediaGroupBufferState) => Promise<void>,
  ): Promise<void> {
    const merged = this.memoryBuffers.get(bufferKey);
    this.memoryBuffers.delete(bufferKey);
    this.memoryTimers.delete(bufferKey);
    if (!merged) {
      return;
    }
    try {
      await flush(merged);
    } catch (error) {
      this.logger.warn(
        `Telegram media group memory flush failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
