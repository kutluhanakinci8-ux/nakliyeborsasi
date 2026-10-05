import { Injectable } from "@nestjs/common";
import { MessagingAttachmentS3Store } from "./MessagingAttachmentS3Store";
import { resolveMessagingAttachmentS3Config } from "./messagingAttachmentStorageConfig";

export type MessagingAttachmentS3ProbeResult = {
  configured: boolean;
  ok: boolean;
  message: string;
  checkedAt: string;
};

@Injectable()
export class MessagingAttachmentS3ProbeService {
  public async probe(): Promise<MessagingAttachmentS3ProbeResult> {
    const checkedAt = new Date().toISOString();
    const config = resolveMessagingAttachmentS3Config();
    if (!config) {
      return {
        configured: false,
        ok: true,
        message:
          "S3 yapılandırılmadı; ekler yerel diskte (MESSAGING_ATTACHMENT_S3_BUCKET).",
        checkedAt,
      };
    }
    try {
      const store = new MessagingAttachmentS3Store(config);
      await store.headBucket();
      await store.probeWriteRead();
      return {
        configured: true,
        ok: true,
        message: `S3 bucket erişilebilir (${config.bucket}).`,
        checkedAt,
      };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Bilinmeyen S3 hatası";
      return {
        configured: true,
        ok: false,
        message: `S3 probe başarısız: ${detail}`,
        checkedAt,
      };
    }
  }
}
