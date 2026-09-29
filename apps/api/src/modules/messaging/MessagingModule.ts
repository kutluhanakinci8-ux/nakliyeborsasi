import { Module } from "@nestjs/common";
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageThreadEntity,
      MessageEntity,
      MessageThreadReadStateEntity,
      MessageThreadUserReadStateEntity,
      MessagingWebPushSubscriptionEntity,
      CompanyEntity,
      FreightListingEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    NotificationModule,
    RedisModule,
    AuditModule,
  ],
  controllers: [
    MessagingModuleStatusController,
    MessagingThreadController,
    MessagingPushController,
    MessagingStreamController,
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
  ],
  exports: [MessagingThreadApplicationService],
})
export class MessagingModule {}
