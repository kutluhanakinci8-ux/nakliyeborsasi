import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import type {
  SocialInboxSyncResult,
  SocialOAuthStartResult,
  SocialProviderPort,
  SocialPublishRequest,
  SocialPublishResult,
} from "./SocialProviderPort";

const PENDING_MESSAGE =
  "LinkedIn Marketing API (Posts) entegrasyonu sonraki fazda etkinleştirilecek.";

@Injectable()
export class LinkedInMarketingPostsProvider implements SocialProviderPort {
  public readonly platformCode = SocialPlatformCode.LinkedIn;

  public getImplementationStatus(): "pending" {
    return "pending";
  }

  public async startOAuthConnect(companyId: string): Promise<SocialOAuthStartResult> {
    return {
      implementationStatus: "pending",
      authorizationUrl: null,
      state: `li-marketing-${companyId}`,
      message: PENDING_MESSAGE,
    };
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
