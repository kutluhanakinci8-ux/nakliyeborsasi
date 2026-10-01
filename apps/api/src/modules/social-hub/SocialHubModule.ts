import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/AuthModule";
import { MessagingModule } from "../messaging/MessagingModule";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubMessagingBridgeService } from "./SocialHubMessagingBridgeService";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialPostEntity } from "../../infrastructure/database/entities/CompanySocialPostEntity";
import { CompanySocialReplyTemplateEntity } from "../../infrastructure/database/entities/CompanySocialReplyTemplateEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanySocialSlackNotifyDedupEntity } from "../../infrastructure/database/entities/CompanySocialSlackNotifyDedupEntity";
import { SocialHubController } from "./SocialHubController";
import { SocialHubApplicationService } from "./SocialHubApplicationService";
import { SocialProviderRegistry } from "./providers/SocialProviderRegistry";
import { MetaInstagramMessagingProvider } from "./providers/MetaInstagramMessagingProvider";
import { MetaFacebookMessengerProvider } from "./providers/MetaFacebookMessengerProvider";
import { WhatsAppCloudWebhookProvider } from "./providers/WhatsAppCloudWebhookProvider";
import { LinkedInMarketingPostsProvider } from "./providers/LinkedInMarketingPostsProvider";
import { SocialPostPublishScheduler } from "./SocialPostPublishScheduler";
import { AuditModule } from "../../infrastructure/audit/AuditModule";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { SocialHubAuditService } from "./SocialHubAuditService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { NotificationModule } from "../notification/NotificationModule";
import { SocialHubModuleStatusController } from "./SocialHubModuleStatusController";
import { CompanySocialOAuthStateEntity } from "../../infrastructure/database/entities/CompanySocialOAuthStateEntity";
import { SocialHubOAuthConfigService } from "./oauth/SocialHubOAuthConfigService";
import { SocialHubOAuthStateService } from "./oauth/SocialHubOAuthStateService";
import { SocialHubOAuthApplicationService } from "./oauth/SocialHubOAuthApplicationService";
import { SocialHubWebhookIngestService } from "./oauth/SocialHubWebhookIngestService";
import { SocialHubPublicIntegrationController } from "./SocialHubPublicIntegrationController";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubWebhookRoutingService } from "./oauth/SocialHubWebhookRoutingService";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { SocialHubPublishApplicationService } from "./SocialHubPublishApplicationService";
import { SocialHubInboxSyncApplicationService } from "./SocialHubInboxSyncApplicationService";
import { SocialHubLinkedInGraphService } from "./oauth/SocialHubLinkedInGraphService";
import { SocialHubMetaInboxHistoryService } from "./oauth/SocialHubMetaInboxHistoryService";
import { SocialHubOutboundMessagingService } from "./SocialHubOutboundMessagingService";
import { CompanySocialOutboundDeliveryEntity } from "../../infrastructure/database/entities/CompanySocialOutboundDeliveryEntity";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { SocialHubTokenRefreshService } from "./oauth/SocialHubTokenRefreshService";
import { SocialHubTokenRefreshScheduler } from "./SocialHubTokenRefreshScheduler";
import { SocialHubHealthAlertService } from "./SocialHubHealthAlertService";
import { SocialHubHealthAlertScheduler } from "./SocialHubHealthAlertScheduler";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";
import { SocialHubSlackDigestService } from "./SocialHubSlackDigestService";
import { SocialHubSlackDigestScheduler } from "./SocialHubSlackDigestScheduler";

@Module({
  imports: [
    AuthModule,
    AuditModule,
    SubscriptionModule,
    NotificationModule,
    forwardRef(() => MessagingModule),
    TypeOrmModule.forFeature([
      CompanySocialConnectionEntity,
      CompanySocialPostEntity,
      CompanySocialReplyTemplateEntity,
      CompanySocialSettingsEntity,
      CompanySocialSlackNotifyDedupEntity,
      CompanySocialThreadLinkEntity,
      MessageThreadEntity,
      CompanyMembershipEntity,
      AuditLogEntity,
      CompanySocialOAuthStateEntity,
      CompanySocialOutboundDeliveryEntity,
      CompanyMessagingSettingsEntity,
    ]),
  ],
  controllers: [
    SocialHubController,
    SocialHubModuleStatusController,
    SocialHubPublicIntegrationController,
  ],
  providers: [
    SocialHubOAuthConfigService,
    SocialHubOAuthStateService,
    SocialHubOAuthApplicationService,
    SocialHubWebhookIngestService,
    SocialHubTokenVaultService,
    SocialHubWebhookRoutingService,
    SocialHubMetaGraphService,
    SocialHubPublishApplicationService,
    SocialHubInboxSyncApplicationService,
    SocialHubLinkedInGraphService,
    SocialHubMetaInboxHistoryService,
    SocialHubApplicationService,
    SocialHubMessagingBridgeService,
    SocialHubOutboundMessagingService,
    SocialHubOutboundDeliveryLogService,
    SocialHubConnectionHealthService,
    SocialHubTokenRefreshService,
    SocialHubTokenRefreshScheduler,
    SocialHubHealthAlertService,
    SocialHubHealthAlertScheduler,
    SocialHubSlackNotificationService,
    SocialHubSlackDigestService,
    SocialHubSlackDigestScheduler,
    SocialProviderRegistry,
    MetaInstagramMessagingProvider,
    MetaFacebookMessengerProvider,
    WhatsAppCloudWebhookProvider,
    LinkedInMarketingPostsProvider,
    SocialPostPublishScheduler,
    SocialHubAuditService,
  ],
  exports: [SocialHubApplicationService, SocialHubOutboundMessagingService],
})
export class SocialHubModule {}
