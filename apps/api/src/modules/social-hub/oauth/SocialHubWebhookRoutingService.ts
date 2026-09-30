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
  }): Promise<WebhookRoute | null> {
    const platform = this.mapMetaObject(params.object);
    if (!platform || !params.entryId) {
      return this.defaultRoute(platform);
    }
    const connection = await this.tokenVault.findConnectedByExternalAccount(
      platform,
      params.entryId,
    );
    if (connection) {
      return { companyId: connection.companyId, platformCode: platform };
    }
    return this.defaultRoute(platform);
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

  private defaultRoute(
    platform: SocialPlatformCode | null,
  ): WebhookRoute | null {
    const companyId = this.configService
      .get<string>("SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID")
      ?.trim();
    if (!companyId || !platform) {
      return null;
    }
    return { companyId, platformCode: platform };
  }
}
