import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import {
  MESSAGING_WEBRTC_MAX_PARTICIPANTS,
  MESSAGING_WEBRTC_ROOM_TTL_SECONDS,
} from "./messagingWebRtcConstants";

export type WebRtcSignalType = "offer" | "answer" | "ice" | "hangup";

export type WebRtcSignalEnvelope = {
  id: string;
  threadId: string;
  fromUserId: string;
  fromCompanyId: string;
  type: WebRtcSignalType;
  payload: string;
  targetUserId?: string | null;
  createdAt: string;
};

export type WebRtcRoomParticipant = {
  userId: string;
  companyId: string;
};

export type WebRtcRoomSnapshot = {
  threadId: string;
  maxParticipants: number;
  participants: WebRtcRoomParticipant[];
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

  public async joinRoom(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcRoomSnapshot> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const roomKey = this.roomRedisKey(threadId);
    const memberKey = this.roomMemberKey(threadId, user.userId);
    const already = await this.redis.exists(memberKey);
    if (!already) {
      const count = await this.redis.scard(roomKey);
      if (count >= MESSAGING_WEBRTC_MAX_PARTICIPANTS) {
        throw new ConflictException(
          `Görüntülü görüşme dolu (en fazla ${MESSAGING_WEBRTC_MAX_PARTICIPANTS} kişi).`,
        );
      }
    }
    await this.redis
      .multi()
      .sadd(roomKey, user.userId)
      .set(
        memberKey,
        user.companyId,
        "EX",
        MESSAGING_WEBRTC_ROOM_TTL_SECONDS,
      )
      .expire(roomKey, MESSAGING_WEBRTC_ROOM_TTL_SECONDS)
      .exec();
    return await this.getRoomSnapshot(user, threadId);
  }

  public async leaveRoom(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcRoomSnapshot> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    await this.redis
      .multi()
      .srem(this.roomRedisKey(threadId), user.userId)
      .del(this.roomMemberKey(threadId, user.userId))
      .exec();
    return await this.getRoomSnapshot(user, threadId);
  }

  public async getRoomSnapshot(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcRoomSnapshot> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const userIds = await this.redis.smembers(this.roomRedisKey(threadId));
    const participants: WebRtcRoomParticipant[] = [];
    for (const userId of userIds) {
      const companyId = await this.redis.get(this.roomMemberKey(threadId, userId));
      if (!companyId) {
        await this.redis.srem(this.roomRedisKey(threadId), userId);
        continue;
      }
      participants.push({ userId, companyId });
    }
    participants.sort((a, b) => a.userId.localeCompare(b.userId));
    return {
      threadId,
      maxParticipants: MESSAGING_WEBRTC_MAX_PARTICIPANTS,
      participants,
    };
  }

  public async postSignal(params: {
    user: AuthenticatedUserContext;
    threadId: string;
    type: WebRtcSignalType;
    payload: string;
    targetUserId?: string | null;
  }): Promise<WebRtcSignalEnvelope> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      params.user,
      params.threadId,
    );
    if (
      params.targetUserId &&
      params.targetUserId === params.user.userId
    ) {
      throw new BadRequestException("targetUserId kendiniz olamaz.");
    }
    const envelope: WebRtcSignalEnvelope = {
      id: randomUUID(),
      threadId: params.threadId,
      fromUserId: params.user.userId,
      fromCompanyId: params.user.companyId,
      type: params.type,
      payload: params.payload,
      targetUserId: params.targetUserId ?? null,
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
        this.isSignalForUser(row, params.user.userId) &&
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
      (row) =>
        row.fromUserId !== params.user.userId &&
        this.isSignalForUser(row, params.user.userId),
    );
  }

  private isSignalForUser(
    row: WebRtcSignalEnvelope,
    userId: string,
  ): boolean {
    if (!row.targetUserId) {
      return true;
    }
    return row.targetUserId === userId;
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

  private roomRedisKey(threadId: string): string {
    return `messaging:webrtc:room:${threadId}`;
  }

  private roomMemberKey(threadId: string, userId: string): string {
    return `messaging:webrtc:room:${threadId}:member:${userId}`;
  }
}
