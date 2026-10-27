import { Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";

const INTENT_TTL_SECONDS = 90 * 24 * 60 * 60;
const NOTE_MAX_LEN = 240;

export type WebRtcMeetOverflowIntentRecord = {
  threadId: string;
  userId: string;
  companyId: string;
  note?: string;
  createdAt: string;
};

@Injectable()
export class MessagingWebRtcMeetOverflowIntentService {
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public async getThreadStatus(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<{ registered: boolean; threadIntentCount: number }> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const threadKey = this.threadSetKey(threadId);
    const [registered, threadIntentCount] = await Promise.all([
      this.redis.sismember(threadKey, user.userId),
      this.redis.scard(threadKey),
    ]);
    return { registered: registered === 1, threadIntentCount };
  }

  public async registerIntent(
    user: AuthenticatedUserContext,
    threadId: string,
    note?: string,
  ): Promise<WebRtcMeetOverflowIntentRecord> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const trimmed =
      typeof note === "string" ? note.trim().slice(0, NOTE_MAX_LEN) : "";
    const record: WebRtcMeetOverflowIntentRecord = {
      threadId,
      userId: user.userId,
      companyId: user.companyId,
      ...(trimmed ? { note: trimmed } : {}),
      createdAt: new Date().toISOString(),
    };
    const threadKey = this.threadSetKey(threadId);
    const memberKey = this.memberKey(threadId, user.userId);
    const globalMember = `${threadId}:${user.userId}`;
    await this.redis
      .multi()
      .sadd(threadKey, user.userId)
      .set(memberKey, JSON.stringify(record), "EX", INTENT_TTL_SECONDS)
      .expire(threadKey, INTENT_TTL_SECONDS)
      .sadd(this.globalSetKey(), globalMember)
      .expire(this.globalSetKey(), INTENT_TTL_SECONDS)
      .exec();
    return record;
  }

  public async countGlobalIntents(): Promise<number> {
    return await this.redis.scard(this.globalSetKey());
  }

  private threadSetKey(threadId: string): string {
    return `messaging:webrtc:overflow:intent:thread:${threadId}`;
  }

  private memberKey(threadId: string, userId: string): string {
    return `messaging:webrtc:overflow:intent:member:${threadId}:${userId}`;
  }

  private globalSetKey(): string {
    return "messaging:webrtc:overflow:intent:global";
  }
}
