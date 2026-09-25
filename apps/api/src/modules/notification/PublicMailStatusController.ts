import { Controller, Get } from "@nestjs/common";
import { MailPlatformMonitoringService } from "./MailPlatformMonitoringService";

@Controller("public/lerta-mail")
export class PublicMailStatusController {
  public constructor(
    private readonly mailPlatformMonitoringService: MailPlatformMonitoringService,
  ) {}

  @Get("status")
  public async status() {
    return {
      statusPage: await this.mailPlatformMonitoringService.buildPublicStatusPage(),
    };
  }
}
