import { Module } from "@nestjs/common";
import { MessagingModuleStatusController } from "./MessagingModuleStatusController";

@Module({
  controllers: [MessagingModuleStatusController],
})
export class MessagingModule {}
