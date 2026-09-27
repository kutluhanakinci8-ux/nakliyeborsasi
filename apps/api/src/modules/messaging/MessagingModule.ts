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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageThreadEntity,
      MessageEntity,
      MessageThreadReadStateEntity,
      CompanyEntity,
      FreightListingEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    NotificationModule,
  ],
  controllers: [MessagingModuleStatusController, MessagingThreadController],
  providers: [MessagingThreadApplicationService, MessagingTranslationService],
  exports: [MessagingThreadApplicationService],
})
export class MessagingModule {}
