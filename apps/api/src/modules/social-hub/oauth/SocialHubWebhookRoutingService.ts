import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubTokenVaultService } from "./SocialHubTokenVaultService";
export type WebhookRoute = {
  companyId: string;
  platformCode: SocialPlatformCode;
};

@Injectable()
export class SocialHubWebhookRoutingService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly tokenVault: SocialHubTokenVaultService,
  ) {}

  public async resolveFromMetaPayload(params: {
    object: string | undefined;
    entryId: string | undefined;
    whatsAppPhoneNumberId?: string | null;
  }): Promise<WebhookRoute | null> {
    const platform = this.mapMetaObject(params.object);
    if (!platform || !params.entryId) {
      return await this.resolveFallbackRoute(platform);
    }
    const connection =
      platform === SocialPlatformCode.WhatsAppCloud
        ? await this.tokenVault.findConnectedWhatsAppWebhookTarget({
            wabaId: params.entryId,
            phoneNumberId: params.whatsAppPhoneNumberId ?? null,
          })
        : await this.tokenVault.findConnectedByExternalAccount(
            platform,
            params.entryId,
          );
    if (connection) {
      return { companyId: connection.companyId, platformCode: platform };
    }
    if (platform === SocialPlatformCode.Instagram) {
      const messenger = await this.tokenVault.findConnectedByExternalAccount(
        SocialPlatformCode.FacebookMessenger,
        params.entryId,
      );
      if (messenger) {
        return {
          companyId: messenger.companyId,
          platformCode: SocialPlatformCode.Instagram,
        };
      }
    }
    return await this.resolveFallbackRoute(platform);
  }

  private mapMetaObject(object: string | undefined): SocialPlatformCode | null {
    switch (object) {
      case "page":
        return SocialPlatformCode.FacebookMessenger;
      case "instagram":
        return SocialPlatformCode.Instagram;
      case "whatsapp_business_account":
        return SocialPlatformCode.WhatsAppCloud;
      default:
        return null;
    }
  }

  private async resolveFallbackRoute(
    platform: SocialPlatformCode | null,
  ): Promise<WebhookRoute | null> {
    if (!platform) {
      return null;
    }
    const companyId = this.configService
      .get<string>("SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID")
      ?.trim();
    if (companyId) {
      return { companyId, platformCode: platform };
    }
    const sole = await this.tokenVault.findSoleConnectedPlatform(platform);
    if (sole) {
      return { companyId: sole.companyId, platformCode: platform };
    }
    return null;
  }
}
