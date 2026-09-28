import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { resolveMessagingVapidFromEnv } from "../../infrastructure/push/messagingVapidEnv";
import { sendWebPushNotification } from "../../infrastructure/push/sendWebPush";
import { MessagingWebPushSubscriptionEntity } from "../../infrastructure/database/entities/MessagingWebPushSubscriptionEntity";

export type MessagingWebPushConfig = {
  enabled: boolean;
  publicKey: string | null;
  /** true = MESSAGING_WEB_PUSH_VAPID_* (mail ile paylaşılmıyor) */
  isolatedVapid: boolean;
};

@Injectable()
export class MessagingWebPushService {
  private readonly logger = new Logger(MessagingWebPushService.name);

  public constructor(
    @InjectRepository(MessagingWebPushSubscriptionEntity)
    private readonly subscriptionRepository: Repository<MessagingWebPushSubscriptionEntity>,
  ) {}

  public getPublicConfig(): MessagingWebPushConfig {
    const vapid = resolveMessagingVapidFromEnv();
    return {
      enabled: Boolean(vapid),
      publicKey: vapid?.publicKey ?? null,
      isolatedVapid: vapid?.isolated ?? false,
    };
  }

  public async registerSubscription(params: {
    userId: string;
    companyId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }): Promise<void> {
    const existing = await this.subscriptionRepository.findOne({
      where: { userId: params.userId, endpoint: params.endpoint },
    });
    if (existing) {
      existing.p256dh = params.p256dh;
      existing.auth = params.auth;
      existing.companyId = params.companyId;
      existing.userAgent = params.userAgent ?? null;
      await this.subscriptionRepository.save(existing);
      return;
    }
    await this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        userId: params.userId,
        companyId: params.companyId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent ?? null,
      }),
    );
  }

  public async unregisterSubscription(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    await this.subscriptionRepository.delete({ userId, endpoint });
  }

  public async notifyNewChatMessage(params: {
    companyId: string;
    threadId: string;
    senderCompanyName: string;
    bodyPreview: string;
    freightListingId: string | null;
  }): Promise<void> {
    const vapid = resolveMessagingVapidFromEnv();
    if (!vapid) {
      return;
    }
    const subs = await this.subscriptionRepository.find({
      where: { companyId: params.companyId },
    });
    if (subs.length === 0) {
      return;
    }
    const webBase =
      process.env.MESSAGING_WEB_PUBLIC_URL?.trim() ??
      process.env.WEB_PUBLIC_BASE_URL?.trim() ??
      "https://app.lerta.com.tr";
    const listingQuery = params.freightListingId
      ? `&listingId=${encodeURIComponent(params.freightListingId)}`
      : "";
    const payload = JSON.stringify({
      title: "Yeni firma mesajı",
      body: `${params.senderCompanyName}: ${params.bodyPreview}`.slice(0, 180),
      url: `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(params.threadId)}${listingQuery}`,
    });
    for (const row of subs) {
      try {
        await sendWebPushNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          vapid,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.subscriptionRepository.delete({ id: row.id });
        } else {
          this.logger.warn(
            `Messaging push failed user=${row.userId} status=${status ?? "?"}`,
          );
        }
      }
    }
  }

}
