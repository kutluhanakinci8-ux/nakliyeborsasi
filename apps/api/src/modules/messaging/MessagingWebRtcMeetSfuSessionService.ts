import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import {
  plannedMessagingWebRtcSfuMaxParticipants,
  resolveMessagingWebRtcSfuSignalingUrl,
} from "./messagingWebRtcSfuBackend";

const SESSION_TTL_SECONDS = 2 * 60 * 60;

export type WebRtcMeetSfuSessionRecord = {
  sessionId: string;
  threadId: string;
  createdByUserId: string;
  companyId: string;
  media: "audio" | "video";
  joinToken: string;
  signalingUrl: string;
  maxParticipants: number;
  createdAt: string;
  expiresAt: string;
};

export type WebRtcMeetSfuSessionJoinBundle = {
  sessionId: string;
  threadId: string;
  signalingUrl: string;
  joinToken: string;
  joinQuery: Record<string, string>;
  maxParticipants: number;
  media: "audio" | "video";
  expiresAt: string;
  pilotHintTr: string;
  embed: {
    mode: "signaling_iframe";
    sandbox: string;
    localMediaPreview: boolean;
    hintTr: string;
  };
};

@Injectable()
export class MessagingWebRtcMeetSfuSessionService {
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public sessionJoinEnabled(): boolean {
    return Boolean(resolveMessagingWebRtcSfuSignalingUrl());
  }

  public async getActiveSession(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcMeetSfuSessionJoinBundle | null> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const raw = await this.redis.get(this.sessionKey(threadId));
    if (!raw) {
      return null;
    }
    try {
      const record = JSON.parse(raw) as WebRtcMeetSfuSessionRecord;
      return this.toJoinBundle(record);
    } catch {
      return null;
    }
  }

  public async createOrRefreshSession(
    user: AuthenticatedUserContext,
    threadId: string,
    media: "audio" | "video",
  ): Promise<WebRtcMeetSfuSessionJoinBundle> {
    const signalingUrl = resolveMessagingWebRtcSfuSignalingUrl();
    if (!signalingUrl) {
      throw new BadRequestException(
        "SFU signaling URL yapılandırılmamış (MESSAGING_WEBRTC_SFU_SIGNALING_URL).",
      );
    }
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const existingRaw = await this.redis.get(this.sessionKey(threadId));
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as WebRtcMeetSfuSessionRecord;
        if (Date.parse(existing.expiresAt) > Date.now()) {
          return this.toJoinBundle(existing);
        }
      } catch {
        // fall through
      }
    }
    const now = Date.now();
    const record: WebRtcMeetSfuSessionRecord = {
      sessionId: randomUUID(),
      threadId,
      createdByUserId: user.userId,
      companyId: user.companyId,
      media,
      joinToken: randomUUID(),
      signalingUrl,
      maxParticipants: plannedMessagingWebRtcSfuMaxParticipants(),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
    };
    await this.redis.set(
      this.sessionKey(threadId),
      JSON.stringify(record),
      "EX",
      SESSION_TTL_SECONDS,
    );
    return this.toJoinBundle(record);
  }

  public async clearSession(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<void> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const deleted = await this.redis.del(this.sessionKey(threadId));
    if (deleted === 0) {
      throw new NotFoundException("SFU oturumu bulunamadı.");
    }
  }

  private sessionKey(threadId: string): string {
    return `messaging:webrtc:sfu:session:${threadId}`;
  }

  private toJoinBundle(
    record: WebRtcMeetSfuSessionRecord,
  ): WebRtcMeetSfuSessionJoinBundle {
    const joinQuery: Record<string, string> = {
      sessionId: record.sessionId,
      threadId: record.threadId,
      token: record.joinToken,
      media: record.media,
    };
    return {
      sessionId: record.sessionId,
      threadId: record.threadId,
      signalingUrl: record.signalingUrl,
      joinToken: record.joinToken,
      joinQuery,
      maxParticipants: record.maxParticipants,
      media: record.media,
      expiresAt: record.expiresAt,
      pilotHintTr:
        "SFU pilot: harici signaling istemcisi bu parametrelerle odaya bağlanır; mesh görüşme ayrı kalır.",
      embed: {
        mode: "signaling_iframe",
        sandbox:
          "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox",
        localMediaPreview: true,
        hintTr:
          "Tarayıcıda yerel kamera/mikrofon önizlemesi + signaling iframe; tam SFU medya sunucusu bağlantısı harici URL üzerinden.",
      },
    };
  }
}
