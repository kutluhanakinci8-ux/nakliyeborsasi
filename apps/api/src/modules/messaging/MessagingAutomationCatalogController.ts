import { Controller, Get } from "@nestjs/common";
import { MessagingCompanyIntegrationService } from "./MessagingCompanyIntegrationService";

@Controller("messaging/integration")
export class MessagingAutomationCatalogController {
  public constructor(
    private readonly messagingCompanyIntegrationService: MessagingCompanyIntegrationService,
  ) {}

  @Get("automation-catalog")
  public automationCatalog() {
    return {
      catalog: this.messagingCompanyIntegrationService.getAutomationCatalog(),
    };
  }
}
