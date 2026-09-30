import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/AuthModule";
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

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CompanySocialConnectionEntity,
      CompanySocialPostEntity,
      CompanySocialReplyTemplateEntity,
      CompanySocialSettingsEntity,
    ]),
  ],
  controllers: [SocialHubController],
  providers: [
    SocialHubApplicationService,
    SocialProviderRegistry,
    MetaInstagramMessagingProvider,
    MetaFacebookMessengerProvider,
    WhatsAppCloudWebhookProvider,
    LinkedInMarketingPostsProvider,
  ],
  exports: [SocialHubApplicationService],
})
export class SocialHubModule {}
