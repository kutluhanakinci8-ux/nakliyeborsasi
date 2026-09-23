import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessagingModuleStatusController } from "./MessagingModuleStatusController";
import { MessagingThreadController } from "./MessagingThreadController";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageThreadEntity, MessageEntity]),
    SubscriptionModule,
    AuthModule,
  ],
  controllers: [MessagingModuleStatusController, MessagingThreadController],
  providers: [MessagingThreadApplicationService],
  exports: [MessagingThreadApplicationService],
})
export class MessagingModule {}
