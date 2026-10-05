import { Injectable, Logger } from "@nestjs/common";
import {
  callTelegramBotApi,
  callTelegramBotMultipart,
} from "./socialHubTelegramApi";
import { formatTelegramApiFailureMessage } from "./socialHubTelegramFlood";
import { parseDiscussionExternalThreadId } from "./socialHubTelegramDiscussionRouting";
import {
  buildTelegramSendMediaGroupForm,
  mapTelegramOutboundMediaItems,
  type TelegramOutboundMediaInput,
} from "./socialHubTelegramOutboundMedia";

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
    replyToMessageId?: number | null;
  }): Promise<TelegramOutboundResult> {
    const text = params.bodyText.trim();
    if (!text) {
      return { ok: false, message: "Mesaj metni boş." };
    }
    const payload: Record<string, unknown> = {
      chat_id: params.chatId,
      text,
    };
    if (params.replyToMessageId) {
      payload.reply_to_message_id = params.replyToMessageId;
    }
    const response = await callTelegramBotApi<{ message_id: number }>(
      params.botToken,
      "sendMessage",
      payload,
    );
    if (!response.ok) {
      const detail = formatTelegramApiFailureMessage(
        response,
        "Telegram mesajı gönderilemedi.",
      );
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

  public resolveOutboundChatTarget(externalThreadId: string): {
    chatId: string;
    replyToMessageId: number | null;
  } {
    const discussion = parseDiscussionExternalThreadId(externalThreadId);
    if (discussion) {
      return {
        chatId: discussion.discussionGroupChatId,
        replyToMessageId: discussion.postMessageId,
      };
    }
    return { chatId: externalThreadId, replyToMessageId: null };
  }

  public async sendWithAttachments(params: {
    botToken: string;
    chatId: string;
    bodyText: string;
    attachments: TelegramOutboundAttachment[];
    replyToMessageId?: number | null;
  }): Promise<TelegramOutboundResult> {
    if (params.attachments.length > 1) {
      return this.sendMediaGroup({
        botToken: params.botToken,
        chatId: params.chatId,
        bodyText: params.bodyText,
        attachments: params.attachments,
        replyToMessageId: params.replyToMessageId,
      });
    }
    const attachment = params.attachments[0];
    if (!attachment) {
      return this.sendTextMessage({
        botToken: params.botToken,
        chatId: params.chatId,
        bodyText: params.bodyText,
        replyToMessageId: params.replyToMessageId,
      });
    }
    const caption = params.bodyText.trim();
    const contentType = attachment.contentType.toLowerCase();
    const form = new FormData();
    form.append("chat_id", params.chatId);
    if (caption) {
      form.append("caption", caption);
    }
    if (params.replyToMessageId) {
      form.append("reply_to_message_id", String(params.replyToMessageId));
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
      const detail = formatTelegramApiFailureMessage(
        response,
        "Telegram medya gönderilemedi.",
      );
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

  public async sendMediaGroup(params: {
    botToken: string;
    chatId: string;
    bodyText: string;
    attachments: TelegramOutboundMediaInput[];
    replyToMessageId?: number | null;
  }): Promise<TelegramOutboundResult> {
    const items = mapTelegramOutboundMediaItems(params.attachments);
    if (items.length < 2) {
      return this.sendWithAttachments({
        botToken: params.botToken,
        chatId: params.chatId,
        bodyText: params.bodyText,
        attachments: params.attachments,
        replyToMessageId: params.replyToMessageId,
      });
    }
    const form = buildTelegramSendMediaGroupForm({
      chatId: params.chatId,
      caption: params.bodyText.trim(),
      items,
      replyToMessageId: params.replyToMessageId,
    });
    const response = await callTelegramBotMultipart<Array<{ message_id: number }>>(
      params.botToken,
      "sendMediaGroup",
      form,
    );
    if (!response.ok) {
      const detail = formatTelegramApiFailureMessage(
        response,
        "Telegram albüm gönderimi başarısız.",
      );
      this.logger.warn(`Telegram media group outbound failed: ${detail}`);
      return { ok: false, message: detail };
    }
    const firstId = response.result?.[0]?.message_id;
    return {
      ok: true,
      message: `Telegram albümü gönderildi (${items.length} medya).`,
      externalMessageId: firstId !== undefined ? String(firstId) : undefined,
    };
  }
}
