import { Injectable } from "@nestjs/common";
import type {
  SocialPublishRequest,
  SocialPublishResult,
} from "./providers/SocialProviderPort";
import { assertRoadmapPlatformCode } from "./socialHubRoadmapInterest";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubXPublishService } from "./oauth/SocialHubXPublishService";

@Injectable()
export class SocialHubRoadmapPublishApplicationService {
  public constructor(
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly xPublishService: SocialHubXPublishService,
  ) {}

  public async publish(
    companyId: string,
    platformCode: string,
    request: SocialPublishRequest,
  ): Promise<SocialPublishResult> {
    const code = assertRoadmapPlatformCode(platformCode);
    if (code === "X") {
      return this.publishX(companyId, request);
    }
    return {
      implementationStatus: "pending",
      externalPostId: null,
      message: `${code} feed yayını henüz desteklenmiyor.`,
    };
  }

  private async publishX(
    companyId: string,
    request: SocialPublishRequest,
  ): Promise<SocialPublishResult> {
    const token = await this.tokenVault.getAccessToken(companyId, "X");
    if (!token) {
      return {
        implementationStatus: "pending",
        externalPostId: null,
        message: "X OAuth token yok; yeniden bağlanın.",
      };
    }
    const result = await this.xPublishService.publishTextTweet({
      accessToken: token,
      bodyText: request.bodyText,
      hasMedia: request.mediaUrls.length > 0,
    });
    if (!result.ok) {
      return {
        implementationStatus: "pending",
        externalPostId: null,
        message: result.message,
      };
    }
    return {
      implementationStatus: "ready",
      externalPostId: result.externalPostId,
      message: result.message,
    };
  }
}
