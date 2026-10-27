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

export type WebRtcMeetRecordingArchiveMeta = {
  id: string;
  threadId: string;
  durationSeconds: number;
  media: "audio" | "video";
  filename: string;
  byteSize: number;
  hasBlob: boolean;
  createdByUserId: string;
  createdAt: string;
  consentAcknowledged?: boolean;
};

const LIST_MAX = 24;
const META_TTL_SECONDS = 90 * 24 * 60 * 60;

@Injectable()
export class MessagingWebRtcMeetRecordingArchiveService {
  private readonly redis: Redis;

  public constructor(
    redisConnectionProvider: RedisConnectionProvider,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {
    this.redis = redisConnectionProvider.getClient();
  }

  public maxArchiveBytes(): number {
    const raw = process.env.MESSAGING_WEBRTC_MEET_RECORDING_MAX_BYTES?.trim();
    const parsed = raw ? Number.parseInt(raw, 10) : 2_500_000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_500_000;
  }

  public async listArchives(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<WebRtcMeetRecordingArchiveMeta[]> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const raw = await this.redis.lrange(this.listKey(threadId), 0, LIST_MAX - 1);
    const parsed: WebRtcMeetRecordingArchiveMeta[] = [];
    for (const line of raw) {
      try {
        parsed.push(JSON.parse(line) as WebRtcMeetRecordingArchiveMeta);
      } catch {
        /* skip */
      }
    }
    return parsed;
  }

  public async createArchive(
    user: AuthenticatedUserContext,
    threadId: string,
    input: {
      durationSeconds: number;
      media: "audio" | "video";
      filename?: string;
      contentBase64?: string;
      consentAcknowledged?: boolean;
    },
  ): Promise<WebRtcMeetRecordingArchiveMeta> {
    await this.messagingThreadApplicationService.assertThreadParticipantForSignaling(
      user,
      threadId,
    );
    const maxBytes = this.maxArchiveBytes();
    let byteSize = 0;
    let hasBlob = false;
    const id = randomUUID();
    if (input.contentBase64?.trim()) {
      if (!input.consentAcknowledged) {
        throw new BadRequestException(
          "Kayıt dosyası için consentAcknowledged gerekli.",
        );
      }
      const buf = Buffer.from(input.contentBase64, "base64");
      byteSize = buf.byteLength;
      if (byteSize > maxBytes) {
        throw new BadRequestException(
          `Kayıt dosyası çok büyük (en fazla ${maxBytes} bayt).`,
        );
      }
      hasBlob = true;
      await this.redis.set(
        this.blobKey(id),
        buf,
        "EX",
        META_TTL_SECONDS,
      );
    }
    const meta: WebRtcMeetRecordingArchiveMeta = {
      id,
      threadId,
      durationSeconds: input.durationSeconds,
      media: input.media,
      filename:
        input.filename?.trim() ||
        `meet-${input.media}-${new Date().toISOString().slice(0, 10)}.webm`,
      byteSize,
      hasBlob,
      createdByUserId: user.userId,
      createdAt: new Date().toISOString(),
      ...(input.consentAcknowledged ? { consentAcknowledged: true } : {}),
    };
    await this.redis
      .multi()
      .lpush(this.listKey(threadId), JSON.stringify(meta))
      .ltrim(this.listKey(threadId), 0, LIST_MAX - 1)
      .expire(this.listKey(threadId), META_TTL_SECONDS)
      .exec();
    return meta;
  }

  public async fetchArchiveBlob(
    user: AuthenticatedUserContext,
    threadId: string,
    archiveId: string,
  ): Promise<{ meta: WebRtcMeetRecordingArchiveMeta; base64: string }> {
    const meta = await this.findMeta(user, threadId, archiveId);
    if (!meta.hasBlob) {
      throw new NotFoundException("Kayıt dosyası yok (yalnızca meta).");
    }
    const buf = await this.redis.getBuffer(this.blobKey(archiveId));
    if (!buf) {
      throw new NotFoundException("Kayıt dosyası süresi dolmuş.");
    }
    return { meta, base64: buf.toString("base64") };
  }

  private async findMeta(
    user: AuthenticatedUserContext,
    threadId: string,
    archiveId: string,
  ): Promise<WebRtcMeetRecordingArchiveMeta> {
    const list = await this.listArchives(user, threadId);
    const meta = list.find((row) => row.id === archiveId);
    if (!meta) {
      throw new NotFoundException("Kayıt arşivi bulunamadı.");
    }
    return meta;
  }

  private listKey(threadId: string): string {
    return `messaging:webrtc:meet:recordings:${threadId}`;
  }

  private blobKey(archiveId: string): string {
    return `messaging:webrtc:meet:recording:blob:${archiveId}`;
  }
}
