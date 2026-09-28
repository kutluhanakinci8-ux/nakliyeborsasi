import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";

@Controller("messaging")
export class MessagingModuleStatusController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
  ) {}

  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    features: string[];
    translate: { deepl: boolean; libretranslate: boolean };
    sse: ReturnType<MessagingRealtimeHubService["getStats"]>;
  } {
    const deepl = Boolean(
      this.configService.get<string>("MESSAGING_DEEPL_API_KEY")?.trim(),
    );
    const libre = Boolean(
      this.configService.get<string>("MESSAGING_TRANSLATE_API_URL")?.trim(),
    );
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
        "sse_stream",
      ],
      translate: { deepl, libretranslate: libre },
      sse: this.messagingRealtimeHubService.getStats(),
    };
  }
}
