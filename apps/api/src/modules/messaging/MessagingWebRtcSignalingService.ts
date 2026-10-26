import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";

export type WebRtcSignalType = "offer" | "answer" | "ice";

export type WebRtcSignalEnvelope = {
  id: string;
  threadId: string;
  fromUserId: string;
  fromCompanyId: string;
  type: WebRtcSignalType;
  payload: string;
  createdAt: string;
};

const SIGNAL_TTL_SECONDS = 7200;
const SIGNAL_MAX_LEN = 80;

@Injectable()
export class MessagingWebRtcSignalingService {
  private readonly logger = new Logger(MessagingWebRtcSignalingService.name);
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public async postSignal(params: {
    user: AuthenticatedUserContext;
    threadId: string;
    type: WebRtcSignalType;
    payload: string;
  }): Promise<WebRtcSignalEnvelope> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      params.user,
      params.threadId,
    );
    const envelope: WebRtcSignalEnvelope = {
      id: randomUUID(),
      threadId: params.threadId,
      fromUserId: params.user.userId,
      fromCompanyId: params.user.companyId,
      type: params.type,
      payload: params.payload,
      createdAt: new Date().toISOString(),
    };
    const key = this.redisKey(params.threadId);
    await this.redis
      .multi()
      .lpush(key, JSON.stringify(envelope))
      .ltrim(key, 0, SIGNAL_MAX_LEN - 1)
      .expire(key, SIGNAL_TTL_SECONDS)
      .exec();
    return envelope;
  }

  public async listSignals(params: {
    user: AuthenticatedUserContext;
    threadId: string;
    afterId?: string | null;
  }): Promise<WebRtcSignalEnvelope[]> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      params.user,
      params.threadId,
    );
    const raw = await this.redis.lrange(this.redisKey(params.threadId), 0, -1);
    const parsed = raw
      .map((line) => {
        try {
          return JSON.parse(line) as WebRtcSignalEnvelope;
        } catch {
          return null;
        }
      })
      .filter((row): row is WebRtcSignalEnvelope => row !== null)
      .reverse();
    const filtered = parsed.filter(
      (row) =>
        row.fromUserId !== params.user.userId &&
        (!params.afterId || row.id !== params.afterId),
    );
    if (!params.afterId) {
      return filtered.slice(-30);
    }
    const idx = parsed.findIndex((row) => row.id === params.afterId);
    if (idx < 0) {
      return filtered.slice(-30);
    }
    return parsed.slice(idx + 1).filter(
      (row) => row.fromUserId !== params.user.userId,
    );
  }

  public async isRelayAvailable(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG";
    } catch (error) {
      this.logger.warn(
        `WebRTC signaling Redis unavailable: ${error instanceof Error ? error.message : "?"}`,
      );
      return false;
    }
  }

  private redisKey(threadId: string): string {
    return `messaging:webrtc:signal:${threadId}`;
  }
}
