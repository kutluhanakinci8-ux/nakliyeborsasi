import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubOAuthApplicationService } from "../oauth/SocialHubOAuthApplicationService";
import { SocialHubOAuthConfigService } from "../oauth/SocialHubOAuthConfigService";
import type {
  SocialInboxSyncResult,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";

const PENDING_MESSAGE =
  "WhatsApp Cloud webhook mesaj işleme tenant eşlemesi sonraki adımda.";

@Injectable()
export class WhatsAppCloudWebhookProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.WhatsAppCloud;

  public constructor(
    private readonly socialHubOAuthApplicationService: SocialHubOAuthApplicationService,
    private readonly socialHubOAuthConfigService: SocialHubOAuthConfigService,
  ) {}

  public getImplementationStatus(): "pending" | "ready" {
    return this.socialHubOAuthConfigService.getMetaConfig() ? "ready" : "pending";
  }

  public async startOAuthConnect(companyId: string): Promise<SocialOAuthStartResult> {
    return this.socialHubOAuthApplicationService.startOAuth(
      companyId,
      this.platformCode,
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
      message: PENDING_MESSAGE,
    };
  }

  public async syncInbox(_companyId: string): Promise<SocialInboxSyncResult> {
    return {
      implementationStatus: "pending",
      importedThreadCount: 0,
      message: PENDING_MESSAGE,
    };
  }
}
