import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MessagingExpoPushTokenEntity } from "../../infrastructure/database/entities/MessagingExpoPushTokenEntity";
import {
  buildMessagingExpoPushMessage,
  isExpoPushTokenInvalid,
  sendExpoPushMessages,
} from "../../infrastructure/push/expoPushSend";
import { UserNotificationPreferenceService } from "../notification/UserNotificationPreferenceService";

@Injectable()
export class MessagingExpoPushService {
  private readonly logger = new Logger(MessagingExpoPushService.name);

  public constructor(
    @InjectRepository(MessagingExpoPushTokenEntity)
    private readonly tokenRepository: Repository<MessagingExpoPushTokenEntity>,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
  ) {}

  public async registerToken(params: {
    userId: string;
    companyId: string;
    expoPushToken: string;
    platform: "ios" | "android";
    userAgent?: string | null;
  }): Promise<void> {
    const existing = await this.tokenRepository.findOne({
      where: {
        userId: params.userId,
        expoPushToken: params.expoPushToken,
      },
    });
    if (existing) {
      existing.companyId = params.companyId;
      existing.platform = params.platform;
      existing.userAgent = params.userAgent ?? null;
      await this.tokenRepository.save(existing);
      return;
    }
    await this.tokenRepository.save(
      this.tokenRepository.create({
        userId: params.userId,
        companyId: params.companyId,
        expoPushToken: params.expoPushToken,
        platform: params.platform,
        userAgent: params.userAgent ?? null,
      }),
    );
  }

  public async unregisterToken(
    userId: string,
    expoPushToken: string,
  ): Promise<void> {
    await this.tokenRepository.delete({ userId, expoPushToken });
  }

  public async notifyNewChatMessage(params: {
    companyId: string;
    threadId: string;
    senderCompanyName: string;
    bodyPreview: string;
    freightListingId: string | null;
  }): Promise<void> {
    const rows = await this.tokenRepository.find({
      where: { companyId: params.companyId },
    });
    if (rows.length === 0) {
      return;
    }
    const webBase =
      process.env.MESSAGING_WEB_PUBLIC_URL?.trim() ??
      process.env.WEB_PUBLIC_BASE_URL?.trim() ??
      "https://app.lerta.com.tr";
    const listingQuery = params.freightListingId
      ? `&listingId=${encodeURIComponent(params.freightListingId)}`
      : "";
    const url = `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(params.threadId)}${listingQuery}`;
    const title = "Yeni firma mesajı";
    const body = `${params.senderCompanyName}: ${params.bodyPreview}`.slice(
      0,
      180,
    );

    const messages = [];
    const rowByToken = new Map<string, MessagingExpoPushTokenEntity>();
    for (const row of rows) {
      const prefs = await this.userNotificationPreferenceService.getForUser(
        row.userId,
      );
      if (!prefs.notifyPushMessagingChat || !prefs.notifyPushMessages) {
        continue;
      }
      messages.push(
        buildMessagingExpoPushMessage({
          expoPushToken: row.expoPushToken,
          title,
          body,
          url,
        }),
      );
      rowByToken.set(row.expoPushToken, row);
    }
    if (messages.length === 0) {
      return;
    }
    try {
      const tickets = await sendExpoPushMessages(messages);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = messages[i]?.to;
        if (!token || !isExpoPushTokenInvalid(ticket)) {
          continue;
        }
        const row = rowByToken.get(token);
        if (row) {
          await this.tokenRepository.delete({ id: row.id });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Expo push batch failed: ${error instanceof Error ? error.message : "?"}`,
      );
    }
  }
}
