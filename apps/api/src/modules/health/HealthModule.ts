import { Module, forwardRef } from "@nestjs/common";
import { HealthController } from "./HealthController";
import { MessagingModule } from "../messaging/MessagingModule";

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [HealthController],
})
export class HealthModule {}
