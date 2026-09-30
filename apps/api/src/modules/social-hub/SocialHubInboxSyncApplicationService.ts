import { Injectable } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import type { SocialInboxSyncResult } from "./providers/SocialProviderPort";

@Injectable()
export class SocialHubInboxSyncApplicationService {
  public constructor(private readonly tokenVault: SocialHubTokenVaultService) {}

  public async sync(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<SocialInboxSyncResult> {
    const token = await this.tokenVault.getAccessToken(companyId, platformCode);
    if (!token) {
      return {
        implementationStatus: "pending",
        importedThreadCount: 0,
        message: "Token yok; gelen kutusu webhook ile güncellenir.",
      };
    }
    return {
      implementationStatus: "ready",
      importedThreadCount: 0,
      message:
        "Canlı mesajlar Meta/WhatsApp webhook üzerinden Mesajlar’a düşer; geçmiş tarama sonraki sürümde.",
    };
  }
}
