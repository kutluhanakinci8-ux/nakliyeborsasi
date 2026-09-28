import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageThreadReadStateEntity } from "../../infrastructure/database/entities/MessageThreadReadStateEntity";
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
import { MessagingCompanyBotEntity } from "../../infrastructure/database/entities/MessagingCompanyBotEntity";
import { MessagingOrgChannelService } from "./MessagingOrgChannelService";
import { MessagingEnterpriseSearchService } from "./MessagingEnterpriseSearchService";
import { MessagingBotApplicationService } from "./MessagingBotApplicationService";
import { MessagingSlackDepthController } from "./MessagingSlackDepthController";
import { MessagingBotIncomingController } from "./MessagingBotIncomingController";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageThreadEntity,
      MessageEntity,
      MessageThreadReadStateEntity,
      MessagingWebPushSubscriptionEntity,
      MessagingCompanyBotEntity,
      CompanyEntity,
      FreightListingEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    NotificationModule,
  ],
  controllers: [
    MessagingModuleStatusController,
    MessagingThreadController,
    MessagingPushController,
    MessagingStreamController,
    MessagingSlackDepthController,
    MessagingBotIncomingController,
  ],
  providers: [
    MessagingThreadApplicationService,
    MessagingOrgChannelService,
    MessagingEnterpriseSearchService,
    MessagingBotApplicationService,
    MessagingTranslationService,
    MessagingAttachmentStorageService,
    MessagingWebPushService,
    MessagingRealtimeHubService,
    MessagingStreamTicketService,
  ],
  exports: [MessagingThreadApplicationService],
})
export class MessagingModule {}
