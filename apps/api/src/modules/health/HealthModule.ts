import { Module } from "@nestjs/common";
import { HealthController } from "./HealthController";
import { MessagingModule } from "../messaging/MessagingModule";

@Module({
  imports: [MessagingModule],
  controllers: [HealthController],
})
export class HealthModule {}
