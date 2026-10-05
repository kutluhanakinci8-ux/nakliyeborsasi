import { Injectable, Logger } from "@nestjs/common";
import { callTelegramBotApi } from "./socialHubTelegramApi";

export type TelegramOutboundResult = {
  ok: boolean;
  message: string;
  externalMessageId?: string;
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
}
