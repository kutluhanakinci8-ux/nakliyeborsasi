import { Injectable, Logger } from "@nestjs/common";
import type { MessagingAttachmentInput } from "../../messaging/MessagingAttachmentStorageService";
import { MessagingAttachmentStorageService } from "../../messaging/MessagingAttachmentStorageService";
import {
  telegramDownloadFile,
  telegramGetFilePath,
} from "./socialHubTelegramApi";
import type { TelegramParsedMedia } from "./socialHubTelegramWebhookParser";

@Injectable()
export class SocialHubTelegramFileService {
  private readonly logger = new Logger(SocialHubTelegramFileService.name);

  public async downloadMediaAsAttachments(
    botToken: string,
    media: TelegramParsedMedia[],
  ): Promise<MessagingAttachmentInput[]> {
    const maxBytes = MessagingAttachmentStorageService.maxBytesPublic();
    const maxCount = MessagingAttachmentStorageService.maxAttachmentsPublic();
    const inputs: MessagingAttachmentInput[] = [];
    for (const item of media.slice(0, maxCount)) {
      try {
        const filePath = await telegramGetFilePath(botToken, item.fileId);
        if (!filePath) {
          continue;
        }
        const buffer = await telegramDownloadFile(botToken, filePath);
        if (!buffer || buffer.length === 0) {
          continue;
        }
        if (buffer.length > maxBytes) {
          this.logger.warn(
            `Telegram file too large (${buffer.length} bytes) fileId=${item.fileId}`,
          );
          continue;
        }
        inputs.push({
          filename: item.filename,
          contentType: item.contentType,
          contentBase64: buffer.toString("base64"),
        });
      } catch (error) {
        this.logger.warn(
          `Telegram media download failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return inputs;
  }
}
