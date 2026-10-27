import { Injectable, Logger } from "@nestjs/common";
import type { MessagingAttachmentInput } from "../../messaging/MessagingAttachmentStorageService";
import { MessagingAttachmentStorageService } from "../../messaging/MessagingAttachmentStorageService";
import { SocialHubMetaGraphService } from "./SocialHubMetaGraphService";

@Injectable()
export class SocialHubWhatsAppMediaService {
  private readonly logger = new Logger(SocialHubWhatsAppMediaService.name);

  public constructor(
    private readonly metaGraphService: SocialHubMetaGraphService,
  ) {}

  public async downloadInboundAudioAsVoiceAttachment(params: {
    accessToken: string;
    mediaId: string;
    mimeType: string;
  }): Promise<MessagingAttachmentInput | null> {
    const maxBytes = MessagingAttachmentStorageService.maxBytesPublic();
    try {
      const downloaded = await this.metaGraphService.downloadWhatsAppMedia({
        accessToken: params.accessToken,
        mediaId: params.mediaId,
      });
      if (!downloaded || downloaded.buffer.length === 0) {
        return null;
      }
      if (downloaded.buffer.length > maxBytes) {
        this.logger.warn(
          `WhatsApp audio too large (${downloaded.buffer.length} bytes) mediaId=${params.mediaId}`,
        );
        return null;
      }
      const contentType = downloaded.mimeType || params.mimeType || "audio/ogg";
      const ext = extensionForAudioMime(contentType);
      return {
        filename: `whatsapp-voice.${ext}`,
        contentType,
        contentBase64: downloaded.buffer.toString("base64"),
        kind: "voice_note",
      };
    } catch (error) {
      this.logger.warn(
        `WhatsApp audio download failed mediaId=${params.mediaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}

function extensionForAudioMime(mime: string): string {
  const base = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (base.includes("mpeg") || base.includes("mp3")) {
    return "mp3";
  }
  if (base.includes("mp4") || base.includes("m4a")) {
    return "m4a";
  }
  if (base.includes("amr")) {
    return "amr";
  }
  return "ogg";
}
