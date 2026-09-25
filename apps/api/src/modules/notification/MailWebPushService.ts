import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import webpush from "web-push";
import { MailWebPushSubscriptionEntity } from "../../infrastructure/database/entities/MailWebPushSubscriptionEntity";

export type MailWebPushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

@Injectable()
export class MailWebPushService {
  private readonly logger = new Logger(MailWebPushService.name);
  private vapidConfigured = false;

  public constructor(
    @InjectRepository(MailWebPushSubscriptionEntity)
    private readonly subscriptionRepository: Repository<MailWebPushSubscriptionEntity>,
  ) {}

  public getPublicConfig(): MailWebPushConfig {
    const publicKey = process.env.MAIL_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
    const privateKey = process.env.MAIL_WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
    return {
      enabled: publicKey.length > 0 && privateKey.length > 0,
      publicKey: publicKey.length > 0 ? publicKey : null,
    };
  }

  private ensureVapid(): boolean {
    const publicKey = process.env.MAIL_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
    const privateKey = process.env.MAIL_WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
    const subject =
      process.env.MAIL_WEB_PUSH_VAPID_SUBJECT?.trim() ??
      "mailto:admin@lerta.tr";
    if (!publicKey || !privateKey) {
      return false;
    }
    if (!this.vapidConfigured) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    }
    return true;
  }

  public async registerSubscription(params: {
    userId: string;
    organizationId: string;
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
      existing.organizationId = params.organizationId;
      existing.userAgent = params.userAgent ?? null;
      await this.subscriptionRepository.save(existing);
      return;
    }
    await this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        userId: params.userId,
        organizationId: params.organizationId,
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

  public async notifySnoozeEnded(params: {
    organizationId: string;
    messageId: string;
    subject: string;
  }): Promise<void> {
    if (!this.ensureVapid()) {
      return;
    }
    const subs = await this.subscriptionRepository.find({
      where: { organizationId: params.organizationId },
    });
    if (subs.length === 0) {
      return;
    }
    const webBase =
      process.env.MAIL_WEB_PUBLIC_URL?.trim() ?? "https://posta.lerta.com.tr";
    const payload = JSON.stringify({
      title: "Ertelenen posta",
      body: params.subject.slice(0, 180),
      url: `${webBase.replace(/\/$/, "")}/mail?message=${params.messageId}`,
    });
    for (const row of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.subscriptionRepository.delete({ id: row.id });
        }
      }
    }
  }

  public async notifyNewInbound(params: {
    organizationId: string;
    messageId: string;
    fromAddress: string;
    subject: string;
  }): Promise<void> {
    if (!this.ensureVapid()) {
      return;
    }
    const subs = await this.subscriptionRepository.find({
      where: { organizationId: params.organizationId },
    });
    if (subs.length === 0) {
      return;
    }
    const webBase =
      process.env.MAIL_WEB_PUBLIC_URL?.trim() ?? "https://posta.lerta.com.tr";
    const payload = JSON.stringify({
      title: "Yeni posta",
      body: `${params.fromAddress}: ${params.subject}`.slice(0, 180),
      url: `${webBase.replace(/\/$/, "")}/mail?message=${params.messageId}`,
    });
    for (const row of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.subscriptionRepository.delete({ id: row.id });
        } else {
          this.logger.warn(
            `Web push failed user=${row.userId} status=${status ?? "?"}`,
          );
        }
      }
    }
  }
}
