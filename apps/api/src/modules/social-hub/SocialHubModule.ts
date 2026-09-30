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
import { SocialHubModuleStatusController } from "./SocialHubModuleStatusController";

@Module({
  imports: [
    AuthModule,
    AuditModule,
    SubscriptionModule,
    forwardRef(() => MessagingModule),
    TypeOrmModule.forFeature([
      CompanySocialConnectionEntity,
      CompanySocialPostEntity,
      CompanySocialReplyTemplateEntity,
      CompanySocialSettingsEntity,
      CompanySocialThreadLinkEntity,
      MessageThreadEntity,
      CompanyMembershipEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [SocialHubController, SocialHubModuleStatusController],
  providers: [
    SocialHubApplicationService,
    SocialHubMessagingBridgeService,
    SocialProviderRegistry,
    MetaInstagramMessagingProvider,
    MetaFacebookMessengerProvider,
    WhatsAppCloudWebhookProvider,
    LinkedInMarketingPostsProvider,
    SocialPostPublishScheduler,
    SocialHubAuditService,
  ],
  exports: [SocialHubApplicationService],
})
export class SocialHubModule {}
