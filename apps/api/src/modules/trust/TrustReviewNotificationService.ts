import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { EmailOutboxService } from "../notification/EmailOutboxService";
import {
  EmailRecipientKind,
  NotificationEventCode,
} from "../notification/NotificationEventCode";
import { MessagingWebPushService } from "../messaging/MessagingWebPushService";

@Injectable()
export class TrustReviewNotificationService {
  private readonly logger = new Logger(TrustReviewNotificationService.name);

  public constructor(
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly messagingWebPushService: MessagingWebPushService,
  ) {}

  public async notifyTransportConfirmNeeded(
    session: AuctionSessionEntity,
    routeLabel: string,
    ownerCompanyId: string,
    winnerCompanyId: string,
    idempotencySuffix = "initial",
  ): Promise<void> {
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    const auctionUrl = `${webBase.replace(/\/$/, "")}/auctions/${session.id}`;
    for (const companyId of [ownerCompanyId, winnerCompanyId]) {
      await this.emailCompanyUsers(companyId, {
        eventCode: NotificationEventCode.TrustTransportConfirmRequest,
        idempotencyKey: `trust-transport-confirm:${session.id}:${companyId}:${idempotencySuffix}`,
        payload: {
          auctionSessionId: session.id,
          routeLabel,
          auctionUrl,
          companyLegalName: companyId,
          occurredAt: new Date().toISOString(),
        },
      });
      await this.messagingWebPushService.notifyTrustPrompt({
        companyId,
        title: "Taşıma onayı bekleniyor",
        body: `${routeLabel} — CMR/teslim onayı verin`,
        url: auctionUrl,
      });
    }
  }

  public async notifyTrustReviewAvailable(params: {
    companyId: string;
    partnerLegalName: string;
    targetCompanyId: string;
    auctionSessionId: string;
    idempotencySuffix?: string;
  }): Promise<void> {
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    const trustUrl = `${webBase.replace(/\/$/, "")}/trust?companyId=${encodeURIComponent(params.targetCompanyId)}`;
    const suffix = params.idempotencySuffix ?? "open";
    await this.emailCompanyUsers(params.companyId, {
      eventCode: NotificationEventCode.TrustReviewReminder,
      idempotencyKey: `trust-review:${params.auctionSessionId}:${params.companyId}:${suffix}`,
      payload: {
        partnerLegalName: params.partnerLegalName,
        trustUrl,
        companyLegalName: params.companyId,
        occurredAt: new Date().toISOString(),
      },
    });
    await this.messagingWebPushService.notifyTrustPrompt({
      companyId: params.companyId,
      title: "Partner değerlendirmesi",
      body: `${params.partnerLegalName} için güven puanı verin`,
      url: trustUrl,
    });
  }

  private async emailCompanyUsers(
    companyId: string,
    params: {
      eventCode: NotificationEventCode;
      idempotencyKey: string;
      payload: Record<string, string>;
    },
  ): Promise<void> {
    const memberships = await this.membershipRepository.find({
      where: { companyId },
      relations: { user: true },
    });
    for (const membership of memberships) {
      const user = membership.user;
      if (!user?.emailAddress) {
        continue;
      }
      try {
        await this.emailOutboxService.enqueue({
          eventCode: params.eventCode,
          recipientKind: EmailRecipientKind.User,
          recipientEmail: user.emailAddress,
          locale: user.preferredLocale ?? "tr",
          payload: params.payload,
          idempotencyKey: `${params.idempotencyKey}:${user.id}`,
          metadata: { userId: user.id, companyId },
        });
      } catch (error) {
        this.logger.warn(
          `Trust email skip ${user.emailAddress}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
