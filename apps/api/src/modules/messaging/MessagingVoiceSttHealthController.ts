import { Controller, Get } from "@nestjs/common";
import { MessagingVoiceSttHealthService } from "./MessagingVoiceSttHealthService";

/** STT-OSS-4: ops health (public — throttled at edge). */
@Controller("messaging/integration/voice-stt")
export class MessagingVoiceSttHealthController {
  public constructor(
    private readonly messagingVoiceSttHealthService: MessagingVoiceSttHealthService,
  ) {}

  @Get("health")
  public async health() {
    return await this.messagingVoiceSttHealthService.probe();
  }
}
