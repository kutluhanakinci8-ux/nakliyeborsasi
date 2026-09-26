import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { CompanyEntity } from "./entities/CompanyEntity";
import { UserAccountEntity } from "./entities/UserAccountEntity";
import { CompanyMembershipEntity } from "./entities/CompanyMembershipEntity";
import { SubscriptionPlanEntity } from "./entities/SubscriptionPlanEntity";
import { CompanySubscriptionEntity } from "./entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "./entities/FreightListingEntity";
import { AuditLogEntity } from "./entities/AuditLogEntity";
import { AuctionSessionEntity } from "./entities/AuctionSessionEntity";
import { AuctionBidEntity } from "./entities/AuctionBidEntity";
import { MessageThreadEntity } from "./entities/MessageThreadEntity";
import { MessageEntity } from "./entities/MessageEntity";
import { CompanyTrustReviewEntity } from "./entities/CompanyTrustReviewEntity";
import { FleetDriverEntity } from "./entities/FleetDriverEntity";
import { FleetVehicleEntity } from "./entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "./entities/FleetDriverVehicleAssignmentEntity";
import { FleetTelemetryDeviceEntity } from "./entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryConsentLogEntity } from "./entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryEventEntity } from "./entities/FleetTelemetryEventEntity";
import { FleetMatchedRouteEntity } from "./entities/FleetMatchedRouteEntity";
import { FleetRouteMatchingJobEntity } from "./entities/FleetRouteMatchingJobEntity";
import { LogisticsPoiEntity } from "./entities/LogisticsPoiEntity";
import { EmailOutboxEntity } from "./entities/EmailOutboxEntity";
import { PlatformNotificationSettingEntity } from "./entities/PlatformNotificationSettingEntity";
import { EmailVerificationTokenEntity } from "./entities/EmailVerificationTokenEntity";
import { PasswordResetTokenEntity } from "./entities/PasswordResetTokenEntity";
import { EmailOutboxEngagementEventEntity } from "./entities/EmailOutboxEngagementEventEntity";
import { EmailOutboxClickTokenEntity } from "./entities/EmailOutboxClickTokenEntity";
import { EmailSuppressionEntity } from "./entities/EmailSuppressionEntity";
import { EmailOrganizationSuppressionEntity } from "./entities/EmailOrganizationSuppressionEntity";
import { UserNotificationPreferenceEntity } from "./entities/UserNotificationPreferenceEntity";
import { CompanyNotificationPreferenceEntity } from "./entities/CompanyNotificationPreferenceEntity";
import { MailDomainEntity } from "./entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "./entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "./entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "./entities/MailInboundMessageEntity";
import { MailMailboxSentEntity } from "./entities/MailMailboxSentEntity";
import { MailImapCredentialEntity } from "./entities/MailImapCredentialEntity";
import { MailComposeDraftEntity } from "./entities/MailComposeDraftEntity";
import { CompanyMailTeamInviteEntity } from "./entities/CompanyMailTeamInviteEntity";
import { MailOrganizationBillingStateEntity } from "./entities/MailOrganizationBillingStateEntity";
import { MailOrganizationOperatorStateEntity } from "./entities/MailOrganizationOperatorStateEntity";
import { MailOrganizationDeletionRequestEntity } from "./entities/MailOrganizationDeletionRequestEntity";
import { MailOrganizationBrandingEntity } from "./entities/MailOrganizationBrandingEntity";
import { MailOrganizationApiKeyEntity } from "./entities/MailOrganizationApiKeyEntity";
import { MailOrganizationWebhookEndpointEntity } from "./entities/MailOrganizationWebhookEndpointEntity";
import { MailAddressAliasEntity } from "./entities/MailAddressAliasEntity";
import { MailAddressAliasTargetEntity } from "./entities/MailAddressAliasTargetEntity";
import { MailWebPushSubscriptionEntity } from "./entities/MailWebPushSubscriptionEntity";
import { MailCustomFolderEntity } from "./entities/MailCustomFolderEntity";
import { MailInboxRuleEntity } from "./entities/MailInboxRuleEntity";
import { MailDelayedComposeEntity } from "./entities/MailDelayedComposeEntity";
import { MailInboxPreferencesEntity } from "./entities/MailInboxPreferencesEntity";
import { MailCalendarEventEntity } from "./entities/MailCalendarEventEntity";
import { MailOrgContactEntity } from "./entities/MailOrgContactEntity";
import { MailCalendarIcsFeedEntity } from "./entities/MailCalendarIcsFeedEntity";

@Injectable()
export class TypeOrmConfigurationFactory implements TypeOrmOptionsFactory {
  public constructor(private readonly configService: ConfigService) {}

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const synchronize =
      this.configService.get<string>("TYPEORM_SYNCHRONIZE") === "true";
    return {
      type: "postgres",
      url: databaseUrl,
      entities: [
        CompanyEntity,
        UserAccountEntity,
        CompanyMembershipEntity,
        SubscriptionPlanEntity,
        CompanySubscriptionEntity,
        FreightListingEntity,
        AuditLogEntity,
        AuctionSessionEntity,
        AuctionBidEntity,
        MessageThreadEntity,
        MessageEntity,
        CompanyTrustReviewEntity,
        FleetDriverEntity,
        FleetVehicleEntity,
        FleetDriverVehicleAssignmentEntity,
        FleetTelemetryDeviceEntity,
        FleetTelemetryConsentLogEntity,
        FleetTelemetryEventEntity,
        FleetMatchedRouteEntity,
        FleetRouteMatchingJobEntity,
        LogisticsPoiEntity,
        EmailOutboxEntity,
        PlatformNotificationSettingEntity,
        EmailVerificationTokenEntity,
        PasswordResetTokenEntity,
        EmailOutboxEngagementEventEntity,
        EmailOutboxClickTokenEntity,
        EmailSuppressionEntity,
        EmailOrganizationSuppressionEntity,
        UserNotificationPreferenceEntity,
        CompanyNotificationPreferenceEntity,
        MailDomainEntity,
        MailSenderIdentityEntity,
        MailMailboxEntity,
        MailInboundMessageEntity,
        MailMailboxSentEntity,
        MailImapCredentialEntity,
        MailComposeDraftEntity,
        CompanyMailTeamInviteEntity,
        MailOrganizationBillingStateEntity,
        MailOrganizationOperatorStateEntity,
        MailOrganizationDeletionRequestEntity,
        MailOrganizationBrandingEntity,
        MailOrganizationApiKeyEntity,
        MailOrganizationWebhookEndpointEntity,
        MailAddressAliasEntity,
        MailAddressAliasTargetEntity,
        MailWebPushSubscriptionEntity,
        MailCustomFolderEntity,
        MailInboxRuleEntity,
        MailDelayedComposeEntity,
        MailInboxPreferencesEntity,
        MailCalendarEventEntity,
        MailOrgContactEntity,
        MailCalendarIcsFeedEntity,
      ],
      synchronize,
      logging: false,
    };
  }
}
