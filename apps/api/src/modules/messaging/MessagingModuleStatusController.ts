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
      phase: "beta",
      features: [
        "company_threads",
        "freight_listing_threads",
        "email_notifications",
        "deep_links",
      ],
    };
  }
}
