import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SocialHubTelegramApplicationService } from "./SocialHubTelegramApplicationService";

@Injectable()
export class SocialHubTelegramWebhookBootstrap implements OnModuleInit {
  private readonly logger = new Logger(SocialHubTelegramWebhookBootstrap.name);

  public constructor(
    private readonly telegramApplicationService: SocialHubTelegramApplicationService,
  ) {}

  public onModuleInit(): void {
    void this.telegramApplicationService.syncConnectedBotWebhooks().catch(
      (error) => {
        this.logger.warn(
          `Telegram webhook bootstrap failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      },
    );
  }
}
