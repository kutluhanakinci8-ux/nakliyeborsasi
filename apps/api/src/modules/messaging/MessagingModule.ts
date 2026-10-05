import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageThreadReadStateEntity } from "../../infrastructure/database/entities/MessageThreadReadStateEntity";
import { MessageThreadUserReadStateEntity } from "../../infrastructure/database/entities/MessageThreadUserReadStateEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { MessagingModuleStatusController } from "./MessagingModuleStatusController";
import { MessagingThreadController } from "./MessagingThreadController";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";
import { NotificationModule } from "../notification/NotificationModule";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { MessagingTranslationService } from "./MessagingTranslationService";
import { MessagingAttachmentStorageService } from "./MessagingAttachmentStorageService";
import { MessagingWebPushService } from "./MessagingWebPushService";
import { MessagingWebPushSubscriptionEntity } from "../../infrastructure/database/entities/MessagingWebPushSubscriptionEntity";
import { MessagingPushController } from "./MessagingPushController";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingStreamTicketService } from "./MessagingStreamTicketService";
import { MessagingStreamController } from "./MessagingStreamController";
import { RedisModule } from "../../infrastructure/redis/RedisModule";
import { AuditModule } from "../../infrastructure/audit/AuditModule";
import { MessagingAuditService } from "./MessagingAuditService";
import { MessagingCompanyMessageRateLimitService } from "./MessagingCompanyMessageRateLimitService";
import { CompanyMessagingWebhookEndpointEntity } from "../../infrastructure/database/entities/CompanyMessagingWebhookEndpointEntity";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { MessageOperationStampEntity } from "../../infrastructure/database/entities/MessageOperationStampEntity";
import { MessagingWebhookDispatcherService } from "./MessagingWebhookDispatcherService";
import { MessagingCompanyIntegrationService } from "./MessagingCompanyIntegrationService";
import { MessagingIntegrationController } from "./MessagingIntegrationController";
import { MessagingAutomationCatalogController } from "./MessagingAutomationCatalogController";
import { MessagingPublicApiController } from "./MessagingPublicApiController";
import { MessagingPublicApiScopeGuard } from "./MessagingPublicApiScopeGuard";
import { MessagingPublicApiAuthService } from "./MessagingPublicApiAuthService";
import { MessagingSlackBridgeService } from "./MessagingSlackBridgeService";
import { MessagingBotService } from "./MessagingBotService";
import { MessagingOptionalWsService } from "./MessagingOptionalWsService";
import { MessagingThreadParticipantService } from "./MessagingThreadParticipantService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";
import { PlatformSupportService } from "./PlatformSupportService";
import { PlatformCommunicationsOpsController } from "./PlatformCommunicationsOpsController";
import { MessageThreadParticipantEntity } from "../../infrastructure/database/entities/MessageThreadParticipantEntity";
import { CompanyMessagingBotCredentialEntity } from "../../infrastructure/database/entities/CompanyMessagingBotCredentialEntity";
import { MessagingPublicApiReadService } from "./MessagingPublicApiReadService";
import { MessagingRetentionScheduler } from "./MessagingRetentionScheduler";
import { AuctionModule } from "../auction/AuctionModule";
import { TrustScoreModule } from "../trust/TrustScoreModule";
import { CompanySocialReplyTemplateEntity } from "../../infrastructure/database/entities/CompanySocialReplyTemplateEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubModule } from "../social-hub/SocialHubModule";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageThreadEntity,
      MessageEntity,
      MessageOperationStampEntity,
      CompanyMessagingWebhookEndpointEntity,
      CompanyMessagingSettingsEntity,
      CompanyMessagingBotCredentialEntity,
      MessageThreadParticipantEntity,
      MessageThreadReadStateEntity,
      MessageThreadUserReadStateEntity,
      MessagingWebPushSubscriptionEntity,
      CompanyEntity,
      FreightListingEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
      CompanySocialReplyTemplateEntity,
      CompanySocialThreadLinkEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    NotificationModule,
    forwardRef(() => AuctionModule),
    forwardRef(() => TrustScoreModule),
    forwardRef(() => SocialHubModule),
    RedisModule,
    AuditModule,
  ],
  controllers: [
    MessagingModuleStatusController,
    MessagingThreadController,
    MessagingPushController,
    MessagingStreamController,
    MessagingIntegrationController,
    MessagingAutomationCatalogController,
    MessagingPublicApiController,
    PlatformCommunicationsOpsController,
  ],
  providers: [
    MessagingThreadApplicationService,
    MessagingTranslationService,
    MessagingAttachmentStorageService,
    MessagingWebPushService,
    MessagingRealtimeHubService,
    MessagingStreamTicketService,
    MessagingAuditService,
    MessagingCompanyMessageRateLimitService,
    MessagingWebhookDispatcherService,
    MessagingCompanyIntegrationService,
    MessagingPublicApiScopeGuard,
    MessagingPublicApiAuthService,
    MessagingPublicApiReadService,
    MessagingRetentionScheduler,
    MessagingSlackBridgeService,
    MessagingBotService,
    MessagingOptionalWsService,
    MessagingThreadParticipantService,
    MessagingWhatsappBridgeService,
    PlatformSupportService,
  ],
  exports: [
    MessagingThreadApplicationService,
    MessagingRealtimeHubService,
    MessagingWebPushService,
    MessagingWhatsappBridgeService,
    MessagingAttachmentStorageService,
  ],
})
export class MessagingModule {}
