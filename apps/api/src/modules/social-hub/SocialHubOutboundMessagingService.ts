import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";
import { SocialHubTikTokOutboundService } from "./oauth/SocialHubTikTokOutboundService";
import { SocialHubYouTubeOutboundService } from "./oauth/SocialHubYouTubeOutboundService";
import { SocialHubXOutboundService } from "./oauth/SocialHubXOutboundService";
import { SocialHubTelegramOutboundService } from "./oauth/SocialHubTelegramOutboundService";
import { isRoadmapPlatformCode } from "./socialHubRoadmapInterest";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessagingAttachmentStorageService } from "../messaging/MessagingAttachmentStorageService";

export type SocialOutboundDispatchResult = {
  attempted: boolean;
  ok: boolean;
  message: string;
  externalMessageId?: string;
};

@Injectable()
export class SocialHubOutboundMessagingService {
  private readonly logger = new Logger(SocialHubOutboundMessagingService.name);

  public constructor(
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly linkRepository: Repository<CompanySocialThreadLinkEntity>,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
    private readonly slackNotificationService: SocialHubSlackNotificationService,
    private readonly tikTokOutboundService: SocialHubTikTokOutboundService,
    private readonly youTubeOutboundService: SocialHubYouTubeOutboundService,
    private readonly xOutboundService: SocialHubXOutboundService,
    private readonly telegramOutboundService: SocialHubTelegramOutboundService,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly messagingAttachmentStorageService: MessagingAttachmentStorageService,
  ) {}

  public async tryDispatchOutbound(params: {
    companyId: string;
    messageThreadId: string;
    messageId: string | null;
    bodyText: string;
    /** Gönderim anında disk/S3 okuma (sesli mesaj köprüsü). */
    inlineAttachments?: Array<{
      buffer: Buffer;
      contentType: string;
      filename: string;
    }>;
  }): Promise<SocialOutboundDispatchResult> {
    const trimmed = params.bodyText.trim();
    const link = await this.linkRepository.findOne({
      where: {
        companyId: params.companyId,
        messageThreadId: params.messageThreadId,
        isOpen: true,
      },
    });
    if (!link) {
      return { attempted: false, ok: true, message: "" };
    }
    const channelAttachments =
      params.inlineAttachments && params.inlineAttachments.length > 0
        ? params.inlineAttachments
        : params.messageId &&
            (link.platformCode === SocialPlatformCode.Telegram ||
              link.platformCode === SocialPlatformCode.WhatsAppCloud)
          ? await this.loadOutboundMessageAttachments(
              params.messageThreadId,
              params.messageId,
            )
          : [];
    if (!trimmed && channelAttachments.length === 0) {
      if (
        params.messageId &&
        link.platformCode === SocialPlatformCode.WhatsAppCloud
      ) {
        const message = await this.messageRepository.findOne({
          where: { id: params.messageId, threadId: params.messageThreadId },
        });
        const expectsVoice = message?.attachments?.some(
          (row) =>
            row.kind === "voice_note" ||
            row.contentType.toLowerCase().startsWith("audio/"),
        );
        if (expectsVoice) {
          const readError =
            "Ses dosyası okunamadı; WhatsApp gönderimi yapılamadı (depolama/S3).";
          await this.recordOutbound({
            link,
            companyId: params.companyId,
            messageId: params.messageId,
            ok: false,
            errorMessage: readError,
            bodyTextPreview: "Sesli mesaj",
          });
          return { attempted: true, ok: false, message: readError };
        }
      }
      return { attempted: false, ok: true, message: "" };
    }
    const bodyPreview =
      trimmed.length > 0
        ? trimmed.slice(0, 280)
        : channelAttachments.map((item) => item.filename).join(", ").slice(0, 280);
    const platformCode = link.platformCode;
    if (link.externalThreadId.startsWith("demo-")) {
      const demoMessage =
        "Demo konuşması — gerçek kanala gönderilmez. OAuth ile bağlı hesaptan yanıtlayın.";
      await this.recordOutbound({
        link,
        companyId: params.companyId,
        messageId: params.messageId,
        ok: false,
        errorMessage: demoMessage,
        bodyTextPreview: bodyPreview,
      });
      return { attempted: true, ok: false, message: demoMessage };
    }
    try {
      if (
        isRoadmapPlatformCode(platformCode) &&
        platformCode !== "TIKTOK" &&
        platformCode !== "YOUTUBE" &&
        platformCode !== "X"
      ) {
        const betaMessage =
          "Bu yol haritası kanalı için giden mesaj henüz desteklenmiyor.";
        await this.recordOutbound({
          link,
          companyId: params.companyId,
          messageId: params.messageId,
          ok: false,
          errorMessage: betaMessage,
          bodyTextPreview: bodyPreview,
        });
        return { attempted: true, ok: false, message: betaMessage };
      }
      const token = await this.tokenVault.requireAccessToken(
        params.companyId,
        platformCode,
      );
      const result = await this.routePlatformOutbound({
        platformCode,
        companyId: params.companyId,
        accessToken: token,
        externalThreadId: link.externalThreadId,
        bodyText: trimmed,
        channelAttachments,
      });
      if (!result.ok) {
        await this.recordOutbound({
          link,
          companyId: params.companyId,
          messageId: params.messageId,
          ok: false,
          errorMessage: result.message,
          bodyTextPreview: bodyPreview,
        });
        await this.slackNotificationService.postOutboundFailure({
          companyId: params.companyId,
          platformCode,
          bodyPreview: bodyPreview,
          errorMessage: result.message,
          threadId: params.messageThreadId,
        });
        this.logger.warn(
          `Social outbound failed thread=${params.messageThreadId} platform=${platformCode}: ${result.message}`,
        );
        return { attempted: true, ok: false, message: result.message };
      }
      await this.recordOutbound({
        link,
        companyId: params.companyId,
        messageId: params.messageId,
        ok: true,
        errorMessage: null,
        externalMessageId: result.externalMessageId,
        bodyTextPreview: bodyPreview,
      });
      return {
        attempted: true,
        ok: true,
        message: result.message,
        externalMessageId: result.externalMessageId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      await this.recordOutbound({
        link,
        companyId: params.companyId,
        messageId: params.messageId,
        ok: false,
        errorMessage: message,
        bodyTextPreview: bodyPreview,
      });
      await this.slackNotificationService.postOutboundFailure({
        companyId: params.companyId,
        platformCode,
        bodyPreview: bodyPreview,
        errorMessage: message,
        threadId: params.messageThreadId,
      });
      this.logger.warn(
        `Social outbound error thread=${params.messageThreadId}: ${message}`,
      );
      return { attempted: true, ok: false, message };
    }
  }

  private async dispatchTikTokOutbound(params: {
    companyId: string;
    accessToken: string;
    externalThreadId: string;
    bodyText: string;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const connection = await this.connectionRepository.findOne({
      where: { companyId: params.companyId, platformCode: "TIKTOK" },
    });
    const businessOpenId = connection?.externalAccountId;
    if (!businessOpenId) {
      return {
        ok: false,
        message: "TikTok işletme open_id yok — yeniden OAuth bağlayın.",
      };
    }
    const send = await this.tikTokOutboundService.sendTextMessage({
      accessToken: params.accessToken,
      businessOpenId,
      recipientExternalId: params.externalThreadId,
      bodyText: params.bodyText,
    });
    return {
      ok: send.ok,
      message: send.message,
      externalMessageId: send.externalMessageId,
    };
  }

  private async dispatchYouTubeOutbound(params: {
    companyId: string;
    accessToken: string;
    externalThreadId: string;
    bodyText: string;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const connection = await this.connectionRepository.findOne({
      where: { companyId: params.companyId, platformCode: "YOUTUBE" },
    });
    const channelId = connection?.externalAccountId;
    if (!channelId) {
      return {
        ok: false,
        message: "YouTube kanal kimliği yok — yeniden OAuth bağlayın.",
      };
    }
    const send = await this.youTubeOutboundService.sendTextMessage({
      accessToken: params.accessToken,
      channelId,
      recipientExternalId: params.externalThreadId,
      bodyText: params.bodyText,
    });
    return {
      ok: send.ok,
      message: send.message,
      externalMessageId: send.externalMessageId,
    };
  }

  private async routePlatformOutbound(params: {
    platformCode: string;
    companyId: string;
    accessToken: string;
    externalThreadId: string;
    bodyText: string;
    channelAttachments: Array<{
      buffer: Buffer;
      contentType: string;
      filename: string;
    }>;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const trimmed = params.bodyText.trim();
    if (params.platformCode === "TIKTOK") {
      return this.dispatchTikTokOutbound({
        companyId: params.companyId,
        accessToken: params.accessToken,
        externalThreadId: params.externalThreadId,
        bodyText: trimmed,
      });
    }
    if (params.platformCode === "YOUTUBE") {
      return this.dispatchYouTubeOutbound({
        companyId: params.companyId,
        accessToken: params.accessToken,
        externalThreadId: params.externalThreadId,
        bodyText: trimmed,
      });
    }
    if (params.platformCode === "X") {
      return this.dispatchXOutbound({
        accessToken: params.accessToken,
        externalThreadId: params.externalThreadId,
        bodyText: trimmed,
      });
    }
    if (params.platformCode === SocialPlatformCode.Telegram) {
      return this.dispatchTelegramOutbound({
        accessToken: params.accessToken,
        externalThreadId: params.externalThreadId,
        bodyText: trimmed,
        attachments: params.channelAttachments,
      });
    }
    if (params.platformCode === SocialPlatformCode.WhatsAppCloud) {
      const audio = params.channelAttachments.find((row) =>
        row.contentType.toLowerCase().startsWith("audio/"),
      );
      if (audio) {
        return this.dispatchWhatsAppAudioOutbound({
          companyId: params.companyId,
          accessToken: params.accessToken,
          recipientExternalId: params.externalThreadId,
          bodyText: trimmed,
          attachment: audio,
        });
      }
      if (!trimmed) {
        return {
          ok: false,
          message:
            "WhatsApp için metin veya ses eki gerekli; boş gönderim yapılmadı.",
        };
      }
      return this.metaGraphService.sendChannelTextMessage({
        companyId: params.companyId,
        platformCode: SocialPlatformCode.WhatsAppCloud,
        accessToken: params.accessToken,
        recipientExternalId: params.externalThreadId,
        bodyText: trimmed,
      });
    }
    return this.metaGraphService.sendChannelTextMessage({
      companyId: params.companyId,
      platformCode: params.platformCode as SocialPlatformCode,
      accessToken: params.accessToken,
      recipientExternalId: params.externalThreadId,
      bodyText: trimmed,
    });
  }

  private async dispatchWhatsAppAudioOutbound(params: {
    companyId: string;
    accessToken: string;
    recipientExternalId: string;
    bodyText: string;
    attachment: { buffer: Buffer; contentType: string; filename: string };
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const connection = await this.connectionRepository.findOne({
      where: {
        companyId: params.companyId,
        platformCode: SocialPlatformCode.WhatsAppCloud,
      },
    });
    const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
    const phoneNumberId = metadata.phoneNumberId;
    return this.metaGraphService.sendWhatsAppAudio({
      phoneNumberId,
      accessToken: params.accessToken,
      to: params.recipientExternalId,
      buffer: params.attachment.buffer,
      contentType: params.attachment.contentType,
      filename: params.attachment.filename,
      caption: params.bodyText.trim() || undefined,
    });
  }

  private async loadOutboundMessageAttachments(
    messageThreadId: string,
    messageId: string,
  ): Promise<
    Array<{ buffer: Buffer; contentType: string; filename: string }>
  > {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId: messageThreadId },
    });
    if (!message?.attachments?.length) {
      return [];
    }
    const loaded: Array<{
      buffer: Buffer;
      contentType: string;
      filename: string;
    }> = [];
    for (const meta of message.attachments) {
      try {
        const file = await this.messagingAttachmentStorageService.readAttachment(
          messageThreadId,
          messageId,
          meta,
        );
        loaded.push(file);
      } catch {
        // skip missing attachment
      }
    }
    return loaded;
  }

  private async dispatchTelegramOutbound(params: {
    accessToken: string;
    externalThreadId: string;
    bodyText: string;
    attachments: Array<{ buffer: Buffer; contentType: string; filename: string }>;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const target = this.telegramOutboundService.resolveOutboundChatTarget(
      params.externalThreadId,
    );
    const send =
      params.attachments.length > 0
        ? await this.telegramOutboundService.sendWithAttachments({
            botToken: params.accessToken,
            chatId: target.chatId,
            bodyText: params.bodyText,
            attachments: params.attachments,
            replyToMessageId: target.replyToMessageId,
          })
        : await this.telegramOutboundService.sendTextMessage({
            botToken: params.accessToken,
            chatId: target.chatId,
            bodyText: params.bodyText,
            replyToMessageId: target.replyToMessageId,
          });
    return {
      ok: send.ok,
      message: send.message,
      externalMessageId: send.externalMessageId,
    };
  }

  private async dispatchXOutbound(params: {
    accessToken: string;
    externalThreadId: string;
    bodyText: string;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const send = await this.xOutboundService.sendDirectMessage({
      accessToken: params.accessToken,
      participantUserId: params.externalThreadId,
      bodyText: params.bodyText,
    });
    return {
      ok: send.ok,
      message: send.message,
      externalMessageId: send.externalMessageId,
    };
  }

  private async recordOutbound(params: {
    link: CompanySocialThreadLinkEntity;
    companyId: string;
    messageId: string | null;
    ok: boolean;
    errorMessage: string | null;
    externalMessageId?: string;
    bodyTextPreview: string;
  }): Promise<void> {
    params.link.lastOutboundAt = new Date();
    params.link.lastOutboundStatus = params.ok ? "ok" : "failed";
    params.link.lastOutboundErrorMessage = params.ok
      ? null
      : params.errorMessage?.slice(0, 512) ?? null;
    await this.linkRepository.save(params.link);
    await this.deliveryLogService.record({
      companyId: params.companyId,
      messageThreadId: params.link.messageThreadId,
      messageId: params.messageId,
      platformCode: params.link.platformCode,
      status: params.ok ? "ok" : "failed",
      errorMessage: params.errorMessage,
      externalMessageId: params.externalMessageId,
      bodyTextPreview: params.bodyTextPreview,
    });
  }
}
