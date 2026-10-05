import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode, ValidationException } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubTokenVaultService } from "./SocialHubTokenVaultService";
import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";
import {
  callTelegramBotApi,
  callTelegramBotMultipart,
  normalizeTelegramChannelRef,
  type TelegramChat,
} from "./socialHubTelegramApi";

export type TelegramPublishResult = {
  ok: boolean;
  message: string;
  externalPostId?: string;
};

@Injectable()
export class SocialHubTelegramPublishService {
  private readonly logger = new Logger(SocialHubTelegramPublishService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly tokenVault: SocialHubTokenVaultService,
  ) {}

  public async setPublishChannel(
    companyId: string,
    channelRef: string,
  ): Promise<{ channelChatId: string; channelTitle: string | null }> {
    const normalized = normalizeTelegramChannelRef(channelRef);
    if (!normalized) {
      throw new ValidationException("Kanal kullanıcı adı veya chat id gerekli.");
    }
    const token = await this.tokenVault.requireAccessToken(
      companyId,
      SocialPlatformCode.Telegram,
    );
    const chatResponse = await callTelegramBotApi<TelegramChat>(token, "getChat", {
      chat_id: normalized,
    });
    if (!chatResponse.ok || !chatResponse.result) {
      throw new ValidationException(
        chatResponse.description ??
          "Telegram kanalı bulunamadı; bot kanala admin olarak eklenmiş olmalı.",
      );
    }
    const chat = chatResponse.result;
    if (chat.type !== "channel" && chat.type !== "supergroup") {
      throw new ValidationException(
        "Yayın hedefi bir kanal veya süper grup olmalı.",
      );
    }
    const me = await callTelegramBotApi<{ id: number }>(token, "getMe");
    const botId = me.result?.id;
    if (!botId) {
      throw new ValidationException("Bot kimliği alınamadı.");
    }
    const member = await callTelegramBotApi<{
      status: string;
      can_post_messages?: boolean;
    }>(token, "getChatMember", {
      chat_id: String(chat.id),
      user_id: botId,
    });
    const status = member.result?.status;
    const canPost =
      status === "administrator" && member.result?.can_post_messages !== false;
    if (!canPost && status !== "creator") {
      throw new ValidationException(
        "Bot kanalda mesaj gönderme yetkisine sahip admin olmalı.",
      );
    }

    const row = await this.connectionRepository.findOne({
      where: { companyId, platformCode: SocialPlatformCode.Telegram },
    });
    if (!row) {
      throw new ValidationException("Önce Telegram bot bağlantısı yapın.");
    }
    const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
    metadata.telegramChannelChatId = String(chat.id);
    metadata.telegramChannelUsername = chat.username ?? null;
    metadata.telegramChannelTitle = chat.title ?? null;
    row.grantedScopes = serializeSocialHubConnectionMetadata(metadata);
    await this.connectionRepository.save(row);

    return {
      channelChatId: String(chat.id),
      channelTitle: chat.title ?? chat.username ?? null,
    };
  }

  public async publishToChannel(params: {
    companyId: string;
    bodyText: string;
    image?: { buffer: Buffer; contentType: string; filename: string };
  }): Promise<TelegramPublishResult> {
    const token = await this.tokenVault.requireAccessToken(
      params.companyId,
      SocialPlatformCode.Telegram,
    );
    const connection = await this.connectionRepository.findOne({
      where: { companyId: params.companyId, platformCode: SocialPlatformCode.Telegram },
    });
    const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
    const channelId = metadata.telegramChannelChatId?.trim();
    if (!channelId) {
      return {
        ok: false,
        message:
          "Telegram yayın kanalı tanımlı değil; Bağlı hesaplardan kanal kullanıcı adını kaydedin.",
      };
    }
    const caption = params.bodyText.trim();

    if (params.image) {
      const form = new FormData();
      form.append("chat_id", channelId);
      if (caption) {
        form.append("caption", caption);
      }
      const blob = new Blob([Uint8Array.from(params.image.buffer)], {
        type: params.image.contentType,
      });
      const field =
        params.image.contentType.startsWith("video/") ? "video" : "photo";
      form.append(field, blob, params.image.filename);
      const method = field === "video" ? "sendVideo" : "sendPhoto";
      const response = await callTelegramBotMultipart<{ message_id: number }>(
        token,
        method,
        form,
      );
      if (!response.ok) {
        const detail = response.description ?? "Telegram kanal yayını başarısız.";
        this.logger.warn(detail);
        return { ok: false, message: detail };
      }
      return {
        ok: true,
        message: "Telegram kanalına yayınlandı.",
        externalPostId: response.result
          ? String(response.result.message_id)
          : undefined,
      };
    }

    if (!caption) {
      return { ok: false, message: "Yayın metni boş." };
    }
    const response = await callTelegramBotApi<{ message_id: number }>(
      token,
      "sendMessage",
      {
        chat_id: channelId,
        text: caption,
      },
    );
    if (!response.ok) {
      const detail = response.description ?? "Telegram kanal yayını başarısız.";
      return { ok: false, message: detail };
    }
    return {
      ok: true,
      message: "Telegram kanalına yayınlandı.",
      externalPostId: response.result
        ? String(response.result.message_id)
        : undefined,
    };
  }
}
