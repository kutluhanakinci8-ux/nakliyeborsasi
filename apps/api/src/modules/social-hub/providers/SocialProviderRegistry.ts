import { Injectable } from "@nestjs/common";
import { SocialPlatformCode, ValidationException } from "@nakliyeborsasi/core";
import type { SocialProviderPort } from "./SocialProviderPort";
import { MetaInstagramMessagingProvider } from "./MetaInstagramMessagingProvider";
import { MetaFacebookMessengerProvider } from "./MetaFacebookMessengerProvider";
import { WhatsAppCloudWebhookProvider } from "./WhatsAppCloudWebhookProvider";
import { LinkedInMarketingPostsProvider } from "./LinkedInMarketingPostsProvider";

@Injectable()
export class SocialProviderRegistry {
  private readonly byPlatform: Map<SocialPlatformCode, SocialProviderPort>;

  public constructor(
    instagramProvider: MetaInstagramMessagingProvider,
    facebookProvider: MetaFacebookMessengerProvider,
    whatsappProvider: WhatsAppCloudWebhookProvider,
    linkedInProvider: LinkedInMarketingPostsProvider,
  ) {
    this.byPlatform = new Map<SocialPlatformCode, SocialProviderPort>([
      [SocialPlatformCode.Instagram, instagramProvider],
      [SocialPlatformCode.FacebookMessenger, facebookProvider],
      [SocialPlatformCode.WhatsAppCloud, whatsappProvider],
      [SocialPlatformCode.LinkedIn, linkedInProvider],
    ]);
  }

  public listPlatforms(): SocialPlatformCode[] {
    return [...this.byPlatform.keys()];
  }

  public resolve(platformCode: string): SocialProviderPort {
    const normalized = platformCode.trim().toUpperCase() as SocialPlatformCode;
    const provider = this.byPlatform.get(normalized);
    if (!provider) {
      throw new ValidationException(`Unknown social platform: ${platformCode}`);
    }
    return provider;
  }
}
