import { Injectable, Logger } from "@nestjs/common";
import {
  callTelegramBotApi,
  callTelegramBotMultipart,
} from "./socialHubTelegramApi";

export type TelegramOutboundResult = {
  ok: boolean;
  message: string;
  externalMessageId?: string;
};

export type TelegramOutboundAttachment = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

@Injectable()
export class SocialHubTelegramOutboundService {
  private readonly logger = new Logger(SocialHubTelegramOutboundService.name);

  public async sendTextMessage(params: {
    botToken: string;
    chatId: string;
    bodyText: string;
  }): Promise<TelegramOutboundResult> {
    const text = params.bodyText.trim();
    if (!text) {
      return { ok: false, message: "Mesaj metni boş." };
    }
    const response = await callTelegramBotApi<{ message_id: number }>(
      params.botToken,
      "sendMessage",
      {
        chat_id: params.chatId,
        text,
      },
    );
    if (!response.ok) {
      const detail = response.description ?? "Telegram mesajı gönderilemedi.";
      this.logger.warn(`Telegram outbound failed: ${detail}`);
      return { ok: false, message: detail };
    }
    return {
      ok: true,
      message: "Telegram mesajı gönderildi.",
      externalMessageId: response.result
        ? String(response.result.message_id)
        : undefined,
    };
  }

  public async sendWithAttachments(params: {
    botToken: string;
    chatId: string;
    bodyText: string;
    attachments: TelegramOutboundAttachment[];
  }): Promise<TelegramOutboundResult> {
    const attachment = params.attachments[0];
    if (!attachment) {
      return this.sendTextMessage({
        botToken: params.botToken,
        chatId: params.chatId,
        bodyText: params.bodyText,
      });
    }
    const caption = params.bodyText.trim();
    const contentType = attachment.contentType.toLowerCase();
    const form = new FormData();
    form.append("chat_id", params.chatId);
    if (caption) {
      form.append("caption", caption);
    }
    const blob = new Blob([Uint8Array.from(attachment.buffer)], {
      type: attachment.contentType,
    });
    let method = "sendDocument";
    let field = "document";
    if (contentType.startsWith("image/")) {
      method = "sendPhoto";
      field = "photo";
    } else if (contentType.startsWith("video/")) {
      method = "sendVideo";
      field = "video";
    } else if (contentType.startsWith("audio/")) {
      method = "sendAudio";
      field = "audio";
    }
    form.append(field, blob, attachment.filename);
    const response = await callTelegramBotMultipart<{ message_id: number }>(
      params.botToken,
      method,
      form,
    );
    if (!response.ok) {
      const detail = response.description ?? "Telegram medya gönderilemedi.";
      this.logger.warn(`Telegram media outbound failed: ${detail}`);
      return { ok: false, message: detail };
    }
    return {
      ok: true,
      message: "Telegram mesajı gönderildi.",
      externalMessageId: response.result
        ? String(response.result.message_id)
        : undefined,
    };
  }
}
