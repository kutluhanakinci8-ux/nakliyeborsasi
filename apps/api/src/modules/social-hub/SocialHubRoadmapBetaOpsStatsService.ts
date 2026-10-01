import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { buildSocialHubIntegrationWebhookReadiness } from "./socialHubIntegrationWebhookReadiness";
import { buildSocialHubPublicWebhookUrls } from "./socialHubIntegrationUrls";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";

export type SocialHubRoadmapBetaPlatformOpsStat = {
  platformCode: string;
  label: string;
  connectedCompanyCount: number;
  openThreadCount: number;
  outboundOk24h: number;
  outboundFailed24h: number;
};

export type SocialHubRoadmapBetaOpsSnapshot = {
  generatedAt: string;
  integrationWebhooks: ReturnType<typeof buildSocialHubPublicWebhookUrls>;
  integrationWebhookReadiness: ReturnType<
    typeof buildSocialHubIntegrationWebhookReadiness
  >;
  platforms: SocialHubRoadmapBetaPlatformOpsStat[];
};

@Injectable()
export class SocialHubRoadmapBetaOpsStatsService {
  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
  ) {}

  public async buildSnapshot(): Promise<SocialHubRoadmapBetaOpsSnapshot> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const platforms: SocialHubRoadmapBetaPlatformOpsStat[] = [];
    for (const provider of SOCIAL_HUB_ROADMAP_PROVIDERS) {
      const code = provider.platformCode;
      const connectedCompanyCount = await this.connectionRepository.count({
        where: {
          platformCode: code,
          statusCode: SocialConnectionStatusCode.Connected,
        },
      });
      const openThreadCount = await this.threadLinkRepository.count({
        where: { platformCode: code, isOpen: true },
      });
      const outbound = await this.deliveryLogService.summarizeGlobalRecentByPlatform(
        code,
        since24h,
      );
      platforms.push({
        platformCode: code,
        label: provider.label,
        connectedCompanyCount,
        openThreadCount,
        outboundOk24h: outbound.ok,
        outboundFailed24h: outbound.failed,
      });
    }
    return {
      generatedAt: new Date().toISOString(),
      integrationWebhooks: buildSocialHubPublicWebhookUrls(),
      integrationWebhookReadiness: buildSocialHubIntegrationWebhookReadiness(),
      platforms,
    };
  }

  public buildCsv(snapshot: SocialHubRoadmapBetaOpsSnapshot): string {
    const header =
      "platformCode,label,connectedCompanyCount,openThreadCount,outboundOk24h,outboundFailed24h";
    const lines = snapshot.platforms.map((row) =>
      [
        row.platformCode,
        escapeCsv(row.label),
        row.connectedCompanyCount,
        row.openThreadCount,
        row.outboundOk24h,
        row.outboundFailed24h,
      ].join(","),
    );
    return [header, ...lines].join("\n");
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
