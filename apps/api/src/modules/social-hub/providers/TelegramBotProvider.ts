import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubOAuthConfigService } from "../oauth/SocialHubOAuthConfigService";
import { SocialHubTelegramApplicationService } from "../oauth/SocialHubTelegramApplicationService";
import { SocialHubInboxSyncApplicationService } from "../SocialHubInboxSyncApplicationService";
import type {
  SocialInboxSyncResult,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";

const PENDING_PUBLISH_MESSAGE =
  "Telegram kanal yayını desteklenmiyor; Mesajlar üzerinden DM yanıtı kullanın.";

@Injectable()
export class TelegramBotProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.Telegram;

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly telegramApplicationService: SocialHubTelegramApplicationService,
    private readonly socialHubInboxSyncApplicationService: SocialHubInboxSyncApplicationService,
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
    _companyId: string,
    _request: SocialPublishRequest,
  ): Promise<SocialPublishResult> {
    return {
      implementationStatus: "pending",
      externalPostId: null,
      message: PENDING_PUBLISH_MESSAGE,
    };
  }

  public async syncInbox(companyId: string): Promise<SocialInboxSyncResult> {
    return this.socialHubInboxSyncApplicationService.sync(
      companyId,
      this.platformCode,
    );
  }
}
