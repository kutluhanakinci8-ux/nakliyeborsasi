import { Injectable } from "@nestjs/common";
import { SocialPlatformCode, ValidationException } from "@nakliyeborsasi/core";
import type { SocialProviderPort } from "./SocialProviderPort";
import { MetaInstagramMessagingProvider } from "./MetaInstagramMessagingProvider";
import { MetaFacebookMessengerProvider } from "./MetaFacebookMessengerProvider";
import { WhatsAppCloudWebhookProvider } from "./WhatsAppCloudWebhookProvider";
import { LinkedInMarketingPostsProvider } from "./LinkedInMarketingPostsProvider";
import { TelegramBotProvider } from "./TelegramBotProvider";

@Injectable()
export class SocialProviderRegistry {
  private readonly byPlatform: Map<SocialPlatformCode, SocialProviderPort>;

  public constructor(
    instagramProvider: MetaInstagramMessagingProvider,
    facebookProvider: MetaFacebookMessengerProvider,
    whatsappProvider: WhatsAppCloudWebhookProvider,
    linkedInProvider: LinkedInMarketingPostsProvider,
    telegramProvider: TelegramBotProvider,
  ) {
    this.byPlatform = new Map<SocialPlatformCode, SocialProviderPort>([
      [SocialPlatformCode.Instagram, instagramProvider],
      [SocialPlatformCode.FacebookMessenger, facebookProvider],
      [SocialPlatformCode.WhatsAppCloud, whatsappProvider],
      [SocialPlatformCode.LinkedIn, linkedInProvider],
      [SocialPlatformCode.Telegram, telegramProvider],
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
