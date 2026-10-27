import { BadRequestException, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";

export type WebRtcMeetScheduleRecord = {
  threadId: string;
  scheduledAt: string;
  media: "audio" | "video";
  note?: string;
  createdByUserId: string;
  createdAt: string;
};

const MIN_LEAD_MS = 2 * 60 * 1000;
const MAX_LEAD_MS = 60 * 24 * 60 * 60 * 1000;
const GRACE_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MessagingWebRtcMeetScheduleService {
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public async getSchedule(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcMeetScheduleRecord | null> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const raw = await this.redis.get(this.redisKey(threadId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as WebRtcMeetScheduleRecord;
    } catch {
      return null;
    }
  }

  public async upsertSchedule(
    user: AuthenticatedUserContext,
    threadId: string,
    input: {
      scheduledAt: string;
      media: "audio" | "video";
      note?: string;
    },
  ): Promise<WebRtcMeetScheduleRecord> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const atMs = Date.parse(input.scheduledAt);
    if (!Number.isFinite(atMs)) {
      throw new BadRequestException("scheduledAt geçersiz.");
    }
    const now = Date.now();
    if (atMs < now + MIN_LEAD_MS) {
      throw new BadRequestException(
        "Planlı görüşme en az 2 dakika sonrası için ayarlanmalı.",
      );
    }
    if (atMs > now + MAX_LEAD_MS) {
      throw new BadRequestException(
        "Planlı görüşme en fazla 60 gün sonrası için ayarlanabilir.",
      );
    }
    const record: WebRtcMeetScheduleRecord = {
      threadId,
      scheduledAt: new Date(atMs).toISOString(),
      media: input.media,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      createdByUserId: user.userId,
      createdAt: new Date().toISOString(),
    };
    const ttlSeconds = Math.ceil((atMs - now + GRACE_AFTER_MS) / 1000);
    await this.redis
      .multi()
      .set(
        this.redisKey(threadId),
        JSON.stringify(record),
        "EX",
        Math.max(ttlSeconds, 3600),
      )
      .zadd(this.indexKey(), atMs, threadId)
      .exec();
    return record;
  }

  public async clearSchedule(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<void> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    await this.redis
      .multi()
      .del(this.redisKey(threadId))
      .zrem(this.indexKey(), threadId)
      .del(this.reminderKey(threadId, "t15"))
      .del(this.reminderKey(threadId, "start"))
      .exec();
  }

  public async getScheduleRaw(
    threadId: string,
  ): Promise<WebRtcMeetScheduleRecord | null> {
    const raw = await this.redis.get(this.redisKey(threadId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as WebRtcMeetScheduleRecord;
    } catch {
      return null;
    }
  }

  public async listThreadIdsScheduledBetween(
    startMs: number,
    endMs: number,
  ): Promise<string[]> {
    return await this.redis.zrangebyscore(
      this.indexKey(),
      startMs,
      endMs,
    );
  }

  public async isReminderSent(
    threadId: string,
    kind: "t15" | "start",
  ): Promise<boolean> {
    const exists = await this.redis.exists(this.reminderKey(threadId, kind));
    return exists === 1;
  }

  public async markReminderSent(
    threadId: string,
    kind: "t15" | "start",
  ): Promise<void> {
    await this.redis.set(this.reminderKey(threadId, kind), "1", "EX", 86400);
  }

  /** Faz 5 öncesi kayıtlar için ZSET index (push hatırlatma). */
  public async backfillScheduleIndex(): Promise<number> {
    let cursor = "0";
    let repaired = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        "messaging:webrtc:meet:schedule:*",
        "COUNT",
        100,
      );
      cursor = next;
      for (const key of keys) {
        if (
          key === this.indexKey() ||
          key.includes(":reminder:sent:") ||
          key.includes(":recording:")
        ) {
          continue;
        }
        const suffix = key.replace(/^messaging:webrtc:meet:schedule:/, "");
        if (!suffix || suffix.includes(":")) {
          continue;
        }
        const raw = await this.redis.get(key);
        if (!raw) {
          continue;
        }
        try {
          const record = JSON.parse(raw) as WebRtcMeetScheduleRecord;
          const atMs = Date.parse(record.scheduledAt);
          if (!Number.isFinite(atMs)) {
            continue;
          }
          await this.redis.zadd(this.indexKey(), atMs, record.threadId);
          repaired += 1;
        } catch {
          /* skip */
        }
      }
    } while (cursor !== "0");
    return repaired;
  }

  private redisKey(threadId: string): string {
    return `messaging:webrtc:meet:schedule:${threadId}`;
  }

  private indexKey(): string {
    return "messaging:webrtc:meet:schedule:index";
  }

  private reminderKey(threadId: string, kind: "t15" | "start"): string {
    return `messaging:webrtc:meet:reminder:sent:${threadId}:${kind}`;
  }
}
