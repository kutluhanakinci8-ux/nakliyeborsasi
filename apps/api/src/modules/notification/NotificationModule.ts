import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { PlatformNotificationSettingEntity } from "../../infrastructure/database/entities/PlatformNotificationSettingEntity";
import { EmailVerificationTokenEntity } from "../../infrastructure/database/entities/EmailVerificationTokenEntity";
import { PasswordResetTokenEntity } from "../../infrastructure/database/entities/PasswordResetTokenEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { AuthModule } from "../auth/AuthModule";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { EmailTemplateService } from "./EmailTemplateService";
import { SmtpEmailSender } from "./SmtpEmailSender";
import { EmailOutboxService } from "./EmailOutboxService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { AuthNotificationService } from "./AuthNotificationService";
import { EmailSecurityTokenService } from "./EmailSecurityTokenService";
import { PlatformNotificationAdminController } from "./PlatformNotificationAdminController";
import { EmailOutboxAnalyticsService } from "./EmailOutboxAnalyticsService";
import { EmailOutboxEngagementEventEntity } from "../../infrastructure/database/entities/EmailOutboxEngagementEventEntity";
import { EmailOutboxClickTokenEntity } from "../../infrastructure/database/entities/EmailOutboxClickTokenEntity";
import { EmailTrackingController } from "./EmailTrackingController";
import { EmailEngagementService } from "./EmailEngagementService";
import { EmailHtmlTrackingService } from "./EmailHtmlTrackingService";
import { EmailTrackingSignatureService } from "./EmailTrackingSignatureService";
import { EmailOutboxProcessor } from "./EmailOutboxProcessor";
import { EmailDeliveryHealthService } from "./EmailDeliveryHealthService";
import { EmailSuppressionEntity } from "../../infrastructure/database/entities/EmailSuppressionEntity";
import { UserNotificationPreferenceEntity } from "../../infrastructure/database/entities/UserNotificationPreferenceEntity";
import { CompanyNotificationPreferenceEntity } from "../../infrastructure/database/entities/CompanyNotificationPreferenceEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { UserNotificationPreferenceService } from "./UserNotificationPreferenceService";
import { CompanyNotificationPreferenceService } from "./CompanyNotificationPreferenceService";
import { OperationalNotificationService } from "./OperationalNotificationService";
import { EmailDeliveryService } from "./EmailDeliveryService";
import { PlatformMailSendingService } from "./PlatformMailSendingService";
import { UserNotificationPreferencesController } from "./UserNotificationPreferencesController";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderResolutionService } from "./MailSenderResolutionService";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { PlatformMailRoadmapService } from "./PlatformMailRoadmapService";
import { PlatformMailIdentityAdminController } from "./PlatformMailIdentityAdminController";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      EmailOutboxEntity,
      PlatformNotificationSettingEntity,
      EmailVerificationTokenEntity,
      PasswordResetTokenEntity,
      UserAccountEntity,
      CompanyEntity,
      CompanyMembershipEntity,
      EmailOutboxEngagementEventEntity,
      EmailOutboxClickTokenEntity,
      EmailSuppressionEntity,
      UserNotificationPreferenceEntity,
      CompanyNotificationPreferenceEntity,
      AuctionSessionEntity,
      AuctionBidEntity,
      MailDomainEntity,
      MailSenderIdentityEntity,
      MailMailboxEntity,
      MailInboundMessageEntity,
    ]),
  ],
  controllers: [
    PlatformNotificationAdminController,
    PlatformMailIdentityAdminController,
    EmailTrackingController,
    UserNotificationPreferencesController,
  ],
  providers: [
    NotificationConfigurationService,
    EmailTemplateService,
    SmtpEmailSender,
    EmailDeliveryService,
    EmailOutboxService,
    PlatformNotificationSettingsService,
    AuthNotificationService,
    EmailSecurityTokenService,
    EmailOutboxProcessor,
    EmailDeliveryHealthService,
    EmailOutboxAnalyticsService,
    EmailEngagementService,
    EmailHtmlTrackingService,
    EmailTrackingSignatureService,
    EmailSuppressionService,
    UserNotificationPreferenceService,
    CompanyNotificationPreferenceService,
    OperationalNotificationService,
    PlatformMailSendingService,
    MailSenderResolutionService,
    MailDomainApplicationService,
    PlatformMailRoadmapService,
    MailDomainDnsVerificationService,
    MailTenantSubdomainService,
  ],
  exports: [
    AuthNotificationService,
    EmailSecurityTokenService,
    EmailOutboxService,
    PlatformNotificationSettingsService,
    OperationalNotificationService,
  ],
})
export class NotificationModule {}
