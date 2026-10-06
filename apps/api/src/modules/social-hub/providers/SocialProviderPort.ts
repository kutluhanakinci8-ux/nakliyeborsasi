import { SocialPlatformCode } from "@nakliyeborsasi/core";

export type SocialProviderImplementationStatus = "pending" | "ready";

export type SocialOAuthStartResult = {
  implementationStatus: SocialProviderImplementationStatus;
  authorizationUrl: string | null;
  state: string | null;
  message: string;
};

export type SocialOAuthConnectContext = {
  webReturnQuery?: string | null;
};

export type SocialPublishRequest = {
  companyId: string;
  bodyText: string;
  mediaUrls: string[];
};

export type SocialPublishResult = {
  implementationStatus: SocialProviderImplementationStatus;
  externalPostId: string | null;
  message: string;
};

export type SocialInboxSyncResult = {
  implementationStatus: SocialProviderImplementationStatus;
  importedThreadCount: number;
  message: string;
};

export interface SocialProviderPort {
  readonly platformCode: SocialPlatformCode;

  getImplementationStatus(): SocialProviderImplementationStatus;

  startOAuthConnect(
    companyId: string,
    context?: SocialOAuthConnectContext,
  ): Promise<SocialOAuthStartResult>;

  disconnect(companyId: string): Promise<void>;

  publishPost(
    companyId: string,
    request: SocialPublishRequest,
  ): Promise<SocialPublishResult>;

  syncInbox(companyId: string): Promise<SocialInboxSyncResult>;
}
