import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubOAuthConfigService } from "../oauth/SocialHubOAuthConfigService";
import { SocialHubTelegramApplicationService } from "../oauth/SocialHubTelegramApplicationService";
import { SocialHubInboxSyncApplicationService } from "../SocialHubInboxSyncApplicationService";
import { SocialHubPublishApplicationService } from "../SocialHubPublishApplicationService";
import type {
  SocialInboxSyncResult,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";


@Injectable()
export class TelegramBotProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.Telegram;

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly telegramApplicationService: SocialHubTelegramApplicationService,
    private readonly socialHubInboxSyncApplicationService: SocialHubInboxSyncApplicationService,
    private readonly socialHubPublishApplicationService: SocialHubPublishApplicationService,
  ) {}

  public getImplementationStatus(): "pending" | "ready" {
    return this.oauthConfig.getOAuthEncryptionKey() ? "ready" : "pending";
  }

  public async startOAuthConnect(_companyId: string): Promise<SocialOAuthStartResult> {
    if (!this.oauthConfig.getOAuthEncryptionKey()) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "Telegram için sunucu şifreleme anahtarı yapılandırılmalı (SOCIAL_OAUTH_ENCRYPTION_KEY).",
      };
    }
    return {
      implementationStatus: "ready",
      authorizationUrl: null,
      state: null,
      message:
        "@BotFather bot token ile bağlanın (Bağlan → token girin). OAuth kullanılmaz.",
    };
  }

  public async disconnect(companyId: string): Promise<void> {
    await this.telegramApplicationService.disconnectBot(companyId);
  }

  public async publishPost(
    companyId: string,
    request: SocialPublishRequest,
  ): Promise<SocialPublishResult> {
    return this.socialHubPublishApplicationService.publish(
      companyId,
      this.platformCode,
      request,
    );
  }

  public async syncInbox(companyId: string): Promise<SocialInboxSyncResult> {
    return this.socialHubInboxSyncApplicationService.sync(
      companyId,
      this.platformCode,
    );
  }
}
