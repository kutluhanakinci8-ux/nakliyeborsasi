import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubOAuthApplicationService } from "../oauth/SocialHubOAuthApplicationService";
import { SocialHubOAuthConfigService } from "../oauth/SocialHubOAuthConfigService";
import { SocialHubInboxSyncApplicationService } from "../SocialHubInboxSyncApplicationService";
import type {
  SocialInboxSyncResult,
  SocialOAuthConnectContext,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";

const PENDING_PUBLISH_MESSAGE =
  "WhatsApp üzerinden feed yayını desteklenmiyor; Mesajlar’dan giden metin aktif.";

@Injectable()
export class WhatsAppCloudWebhookProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.WhatsAppCloud;

  public constructor(
    private readonly socialHubOAuthApplicationService: SocialHubOAuthApplicationService,
    private readonly socialHubOAuthConfigService: SocialHubOAuthConfigService,
    private readonly socialHubInboxSyncApplicationService: SocialHubInboxSyncApplicationService,
  ) {}

  public getImplementationStatus(): "pending" | "ready" {
    return this.socialHubOAuthConfigService.getMetaConfig() ? "ready" : "pending";
  }

  public async startOAuthConnect(
    companyId: string,
    context?: SocialOAuthConnectContext,
  ): Promise<SocialOAuthStartResult> {
    return this.socialHubOAuthApplicationService.startOAuth(
      companyId,
      this.platformCode,
      context,
    );
  }

  public async disconnect(_companyId: string): Promise<void> {
    return;
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
