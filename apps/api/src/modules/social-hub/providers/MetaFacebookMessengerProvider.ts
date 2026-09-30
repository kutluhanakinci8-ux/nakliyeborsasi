import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubOAuthApplicationService } from "../oauth/SocialHubOAuthApplicationService";
import { SocialHubOAuthConfigService } from "../oauth/SocialHubOAuthConfigService";
import { SocialHubPublishApplicationService } from "../SocialHubPublishApplicationService";
import { SocialHubInboxSyncApplicationService } from "../SocialHubInboxSyncApplicationService";
import type {
  SocialInboxSyncResult,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";

@Injectable()
export class MetaFacebookMessengerProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.FacebookMessenger;

  public constructor(
    private readonly socialHubOAuthApplicationService: SocialHubOAuthApplicationService,
    private readonly socialHubOAuthConfigService: SocialHubOAuthConfigService,
    private readonly socialHubPublishApplicationService: SocialHubPublishApplicationService,
    private readonly socialHubInboxSyncApplicationService: SocialHubInboxSyncApplicationService,
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
