import { Controller, Get } from "@nestjs/common";

@Controller("messaging")
export class MessagingModuleStatusController {
  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    features: string[];
  } {
    return {
      module: "messaging",
      phase: "ga",
      features: [
        "company_threads",
        "freight_listing_threads",
        "email_notifications",
        "deep_links",
        "read_receipts",
        "structured_summary",
        "translate_api",
        "company_export",
        "platform_ediscovery",
        "org_channels",
        "enterprise_search",
        "incoming_bot_webhook",
      ],
    };
  }
}
