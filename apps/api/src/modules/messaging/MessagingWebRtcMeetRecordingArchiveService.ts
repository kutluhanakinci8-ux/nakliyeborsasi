import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type Redis from "ioredis";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { RedisConnectionProvider } from "../../infrastructure/redis/RedisConnectionProvider";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import {
  buildMeetRecordingS3Key,
  getMeetRecordingS3,
  meetRecordingMaxBytes,
  meetRecordingS3Enabled,
  putMeetRecordingS3,
} from "./messagingWebRtcMeetRecordingS3";

export type WebRtcMeetRecordingArchiveMeta = {
  id: string;
  threadId: string;
  durationSeconds: number;
  media: "audio" | "video";
  filename: string;
  byteSize: number;
  hasBlob: boolean;
  storage?: "redis" | "s3";
  storagePath?: string;
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
    return meetRecordingMaxBytes();
  }

  public recordingStorageSnapshot(): {
    s3Enabled: boolean;
    maxBytes: number;
  } {
    return {
      s3Enabled: meetRecordingS3Enabled(),
      maxBytes: meetRecordingMaxBytes(),
    };
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
    let storage: "redis" | "s3" | undefined;
    let storagePath: string | undefined;
    const id = randomUUID();
    const filename =
      input.filename?.trim() ||
      `meet-${input.media}-${new Date().toISOString().slice(0, 10)}.webm`;
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
      if (meetRecordingS3Enabled()) {
        const key = buildMeetRecordingS3Key(threadId, id, filename);
        storagePath = await putMeetRecordingS3(
          key,
          buf,
          "video/webm",
        );
        storage = "s3";
      } else {
        await this.redis.set(
          this.blobKey(id),
          buf,
          "EX",
          META_TTL_SECONDS,
        );
        storage = "redis";
      }
    }
    const meta: WebRtcMeetRecordingArchiveMeta = {
      id,
      threadId,
      durationSeconds: input.durationSeconds,
      media: input.media,
      filename,
      byteSize,
      hasBlob,
      ...(storage ? { storage } : {}),
      ...(storagePath ? { storagePath } : {}),
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

  public async exportManifest(
    user: AuthenticatedUserContext,
    threadId: string,
  ): Promise<{
    threadId: string;
    exportedAt: string;
    archiveCount: number;
    archives: Array<
      WebRtcMeetRecordingArchiveMeta & { contentSha256?: string }
    >;
  }> {
    const archives = await this.listArchives(user, threadId);
    const enriched: Array<
      WebRtcMeetRecordingArchiveMeta & { contentSha256?: string }
    > = [];
    for (const meta of archives) {
      if (!meta.hasBlob) {
        enriched.push(meta);
        continue;
      }
      try {
        const { base64 } = await this.fetchArchiveBlob(user, threadId, meta.id);
        const sha = createHash("sha256")
          .update(Buffer.from(base64, "base64"))
          .digest("hex");
        enriched.push({ ...meta, contentSha256: sha });
      } catch {
        enriched.push(meta);
      }
    }
    return {
      threadId,
      exportedAt: new Date().toISOString(),
      archiveCount: enriched.length,
      archives: enriched,
    };
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
    if (meta.storage === "s3" && meta.storagePath) {
      const buf = await getMeetRecordingS3(meta.storagePath);
      return { meta, base64: buf.toString("base64") };
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
