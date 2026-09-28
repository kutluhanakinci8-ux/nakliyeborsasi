import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Repository } from "typeorm";
import {
  AuthorizationException,
  CompanyRoleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessagingCompanyBotEntity } from "../../infrastructure/database/entities/MessagingCompanyBotEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingWebPushService } from "./MessagingWebPushService";
import {
  MESSAGING_BOT_USER_ID,
} from "./MessagingSlackDepthConstants";
import { MessagingOrgChannelService } from "./MessagingOrgChannelService";

@Injectable()
export class MessagingBotApplicationService {
  public constructor(
    @InjectRepository(MessagingCompanyBotEntity)
    private readonly botRepository: Repository<MessagingCompanyBotEntity>,
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly messagingOrgChannelService: MessagingOrgChannelService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingWebPushService: MessagingWebPushService,
  ) {}

  public async getBotConfig(user: AuthenticatedUserContext): Promise<{
    botDisplayName: string;
    hasWebhookToken: boolean;
    incomingPath: string;
  }> {
    this.assertOwner(user);
    const row = await this.botRepository.findOne({
      where: { companyId: user.companyId },
    });
    return {
      botDisplayName: row?.botDisplayName ?? "Lerta Bot",
      hasWebhookToken: Boolean(row?.webhookToken),
      incomingPath: "/api/v1/messaging/bot/incoming",
    };
  }

  public async rotateWebhookToken(user: AuthenticatedUserContext): Promise<{
    botDisplayName: string;
    webhookToken: string;
  }> {
    this.assertOwner(user);
    const token = randomBytes(24).toString("base64url");
    let row = await this.botRepository.findOne({
      where: { companyId: user.companyId },
    });
    if (!row) {
      row = this.botRepository.create({
        companyId: user.companyId,
        webhookToken: token,
        botDisplayName: "Lerta Bot",
      });
    } else {
      row.webhookToken = token;
    }
    await this.botRepository.save(row);
    return {
      botDisplayName: row.botDisplayName,
      webhookToken: token,
    };
  }

  public async postIncomingBotMessage(params: {
    webhookToken: string;
    channelSlug: string;
    text: string;
    botName?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const token = params.webhookToken.trim();
    const slug = params.channelSlug.trim().toLowerCase();
    const text = params.text.trim();
    if (!token || !slug || text.length < 1) {
      throw new ValidationException("token, channelSlug ve text gerekli");
    }
    const config = await this.botRepository.findOne({
      where: { webhookToken: token },
    });
    if (!config) {
      throw new AuthorizationException("Geçersiz bot webhook token");
    }
    await this.messagingOrgChannelService.ensureDefaultChannels(
      config.companyId,
    );
    const thread = await this.messageThreadRepository.findOne({
      where: {
        companyAId: config.companyId,
        companyBId: config.companyId,
        threadKind: "org_channel",
        channelSlug: slug,
      },
    });
    if (!thread) {
      throw new ValidationException(`Kanal bulunamadı: ${slug}`);
    }
    const label =
      params.botName?.trim().slice(0, 120) || config.botDisplayName;
    const saved = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        senderCompanyId: config.companyId,
        senderUserId: MESSAGING_BOT_USER_ID,
        bodyText: text,
        senderKind: "bot",
        senderLabel: label,
        attachments: null,
      }),
    );
    this.messagingRealtimeHubService.publish(config.companyId, {
      type: "message",
      threadId: thread.id,
    });
    void this.messagingWebPushService.notifyNewChatMessage({
      companyId: config.companyId,
      threadId: thread.id,
      senderCompanyName: label,
      bodyPreview: text.slice(0, 280),
      freightListingId: null,
    });
    return { messageId: saved.id, threadId: thread.id };
  }

  public verifyToken(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  private assertOwner(user: AuthenticatedUserContext): void {
    if (!user.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException("Bot ayarları için firma sahibi gerekir");
    }
  }
}
