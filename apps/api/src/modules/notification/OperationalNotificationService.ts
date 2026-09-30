import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { CompanyNotificationPreferenceService } from "./CompanyNotificationPreferenceService";
import { UserNotificationPreferenceService } from "./UserNotificationPreferenceService";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { In } from "typeorm";

@Injectable()
export class OperationalNotificationService {
  private readonly logger = new Logger(OperationalNotificationService.name);

  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly platformNotificationSettingsService: PlatformNotificationSettingsService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly companyNotificationPreferenceService: CompanyNotificationPreferenceService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
  ) {}

  public async afterMessagingUserMention(params: {
    companyId: string;
    mentionedUserIds: string[];
    threadId: string;
    senderCompanyName: string;
    bodyPreview: string;
    messageId: string;
    freightListingId: string | null;
  }): Promise<void> {
    if (params.mentionedUserIds.length === 0) {
      return;
    }
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const listingQuery = params.freightListingId
      ? `&listingId=${encodeURIComponent(params.freightListingId)}`
      : "";
    await this.emitToUserIds({
      companyId: params.companyId,
      userIds: params.mentionedUserIds,
      eventCode: NotificationEventCode.MessagingUserMention,
      payload: {
        threadId: params.threadId,
        senderCompanyName: params.senderCompanyName,
        messagePreview: params.bodyPreview,
        messagingUrl: `${baseUrl}/messaging?tab=chat&threadId=${encodeURIComponent(params.threadId)}${listingQuery}`,
        occurredAt: new Date().toISOString(),
      },
      idempotencyPrefix: `MESSAGING_MENTION:${params.messageId}`,
    });
  }

  public async afterSocialHubHealthDegraded(params: {
    companyId: string;
    ownerUserIds: string[];
    overallStatus: string;
    summary: string;
    hubUrl: string;
  }): Promise<void> {
    if (params.ownerUserIds.length === 0) {
      return;
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    await this.emitToUserIds({
      companyId: params.companyId,
      userIds: params.ownerUserIds,
      eventCode: NotificationEventCode.SocialHubHealthDegraded,
      payload: {
        overallStatus: params.overallStatus,
        messagePreview: params.summary,
        messagingUrl: params.hubUrl,
        hubUrl: params.hubUrl,
        occurredAt: new Date().toISOString(),
      },
      idempotencyPrefix: `SOCIAL_HUB_HEALTH:${params.companyId}:${dayKey}:${params.overallStatus}`,
    });
  }

  public async afterMessagingMessageSent(params: {
    threadId: string;
    counterpartyCompanyId: string;
    senderCompanyId: string;
    senderCompanyName: string;
    messageId: string;
    bodyPreview: string;
    freightListingId: string | null;
  }): Promise<void> {
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const listingQuery = params.freightListingId
      ? `&listingId=${encodeURIComponent(params.freightListingId)}`
      : "";
    await this.emitToCompany({
      companyId: params.counterpartyCompanyId,
      eventCode: NotificationEventCode.MessagingNewMessage,
      payload: {
        threadId: params.threadId,
        senderCompanyId: params.senderCompanyId,
        senderCompanyName: params.senderCompanyName,
        bidderCompanyName: params.senderCompanyName,
        messagePreview: params.bodyPreview,
        messagingUrl: `${baseUrl}/messaging?tab=chat&threadId=${encodeURIComponent(params.threadId)}${listingQuery}`,
        occurredAt: new Date().toISOString(),
        freightListingId: params.freightListingId ?? "",
      },
      idempotencyPrefix: `MESSAGING_MSG:${params.messageId}`,
    });
  }

  public async afterAuctionBidPlaced(params: {
    session: AuctionSessionEntity;
    bid: AuctionBidEntity;
    bidderCompanyId: string;
    previousLeaderCompanyId: string | null;
  }): Promise<void> {
    const baseUrl = this.notificationConfigurationService.resolveWebBaseUrl();
    const bidder = await this.companyRepository.findOne({
      where: { id: params.bidderCompanyId },
    });
    const payload: Record<string, string> = {
      auctionSessionId: params.session.id,
      bidAmount: params.bid.bidAmount,
      bidderCompanyName: bidder?.legalName ?? params.bidderCompanyId,
      auctionUrl: `${baseUrl}/auctions/${params.session.id}`,
      occurredAt: new Date().toISOString(),
    };

    await this.emitToCompany({
      companyId: params.session.ownerCompanyId,
      eventCode: NotificationEventCode.AuctionBidPlaced,
      payload,
      idempotencyPrefix: `AUCTION_BID:${params.session.id}:${params.bid.id}`,
    });

    if (
      params.previousLeaderCompanyId &&
      params.previousLeaderCompanyId !== params.bidderCompanyId
    ) {
      await this.emitToCompany({
        companyId: params.previousLeaderCompanyId,
        eventCode: NotificationEventCode.AuctionOutbid,
        payload,
        idempotencyPrefix: `AUCTION_OUTBID:${params.session.id}:${params.bid.id}`,
      });
    }
  }

  private async emitToUserIds(params: {
    companyId: string;
    userIds: string[];
    eventCode: NotificationEventCode;
    payload: Record<string, string>;
    idempotencyPrefix: string;
  }): Promise<void> {
    const uniqueIds = [...new Set(params.userIds)];
    if (uniqueIds.length === 0) {
      return;
    }
    const users = await this.userRepository.find({
      where: { id: In(uniqueIds) },
    });
    const settings =
      await this.platformNotificationSettingsService.getSetting(
        params.eventCode,
      );
    if (!settings.userEmailEnabled) {
      return;
    }
    for (const user of users) {
      const membership = await this.membershipRepository.findOne({
        where: { companyId: params.companyId, userId: user.id },
      });
      if (!membership) {
        continue;
      }
      const allowed =
        await this.userNotificationPreferenceService.isUserEmailAllowed(
          user.id,
          params.eventCode,
        );
      if (!allowed) {
        continue;
      }
      await this.emailOutboxService.enqueue({
        eventCode: params.eventCode,
        recipientKind: EmailRecipientKind.User,
        recipientEmail: user.emailAddress,
        locale: user.preferredLocale ?? "tr",
        payload: {
          ...params.payload,
          displayName: user.displayName,
          emailAddress: user.emailAddress,
        },
        idempotencyKey: `${params.idempotencyPrefix}:user:${user.id}`,
        metadata: { userId: user.id, companyId: params.companyId },
      });
    }
  }

  private async emitToCompany(params: {
    companyId: string;
    eventCode: NotificationEventCode;
    payload: Record<string, string>;
    idempotencyPrefix: string;
  }): Promise<void> {
    try {
      const settings =
        await this.platformNotificationSettingsService.getSetting(
          params.eventCode,
        );
      const ownerCompany = await this.companyRepository.findOne({
        where: { id: params.companyId },
      });
      params.payload.companyLegalName =
        ownerCompany?.legalName ?? params.companyId;

      if (settings.adminEmailEnabled) {
        const adminEmails =
          settings.adminRecipientEmails.length > 0
            ? settings.adminRecipientEmails
            : this.notificationConfigurationService.resolveDefaultAdminRecipients();
        for (const email of adminEmails) {
          await this.emailOutboxService.enqueue({
            eventCode: params.eventCode,
            recipientKind: EmailRecipientKind.Admin,
            recipientEmail: email,
            locale: "tr",
            payload: params.payload,
            idempotencyKey: `${params.idempotencyPrefix}:admin:${email}`,
            metadata: { companyId: params.companyId },
          });
        }
      }

      if (!settings.userEmailEnabled) {
        return;
      }

      const pref =
        await this.companyNotificationPreferenceService.getCompanyPreference(
          params.companyId,
        );
      if (!pref.emailOpsEnabled) {
        return;
      }

      const memberships = await this.membershipRepository.find({
        where: { companyId: params.companyId },
      });
      const users =
        memberships.length > 0
          ? await this.userRepository.find({
              where: { id: In(memberships.map((row) => row.userId)) },
            })
          : [];

      for (const user of users) {
        const allowed =
          await this.userNotificationPreferenceService.isUserEmailAllowed(
            user.id,
            params.eventCode,
          );
        if (!allowed) {
          continue;
        }
        await this.emailOutboxService.enqueue({
          eventCode: params.eventCode,
          recipientKind: EmailRecipientKind.User,
          recipientEmail: user.emailAddress,
          locale: user.preferredLocale ?? "tr",
          payload: {
            ...params.payload,
            displayName: user.displayName,
            emailAddress: user.emailAddress,
          },
          idempotencyKey: `${params.idempotencyPrefix}:user:${user.id}`,
          metadata: { userId: user.id, companyId: params.companyId },
        });
      }

      const memberEmails = new Set(
        users.map((user) => user.emailAddress.toLowerCase()),
      );
      for (const extra of pref.extraRecipientEmails ?? []) {
        const normalized = extra.trim().toLowerCase();
        if (!normalized || memberEmails.has(normalized)) {
          continue;
        }
        await this.emailOutboxService.enqueue({
          eventCode: params.eventCode,
          recipientKind: EmailRecipientKind.User,
          recipientEmail: normalized,
          locale: "tr",
          payload: params.payload,
          idempotencyKey: `${params.idempotencyPrefix}:extra:${normalized}`,
          metadata: { companyId: params.companyId, extraRecipient: true },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Operational notification skipped for ${params.eventCode}`,
        error,
      );
    }
  }
}
