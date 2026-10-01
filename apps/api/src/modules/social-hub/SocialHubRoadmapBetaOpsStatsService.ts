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
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "./SocialHubAuditService";
import { buildSocialHubIntegrationOpsHints } from "./socialHubIntegrationOpsHints";

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
  integrationOpsHints: ReturnType<typeof buildSocialHubIntegrationOpsHints>;
  webhookInboundBridged24h: number;
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
    private readonly auditService: SocialHubAuditService,
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
    const webhookInboundBridged24h = await this.auditService.countRecentByAction(
      SocialHubAuditActionCode.WebhookInboundBridged,
      since24h,
    );
    return {
      generatedAt: new Date().toISOString(),
      integrationWebhooks: buildSocialHubPublicWebhookUrls(),
      integrationWebhookReadiness: buildSocialHubIntegrationWebhookReadiness(),
      integrationOpsHints: buildSocialHubIntegrationOpsHints(),
      webhookInboundBridged24h,
      platforms,
    };
  }

  public async buildWebhookBridgeAuditCsv(limit = 500): Promise<string> {
    const rows = await this.auditService.listGlobalRecentByAction(
      SocialHubAuditActionCode.WebhookInboundBridged,
      limit,
    );
    const header =
      "id,companyId,platformCode,threadId,externalThreadId,createdAt";
    const lines = rows.map((row) => {
      const meta = row.metadata ?? {};
      const platformCode =
        typeof meta.platformCode === "string" ? meta.platformCode : "";
      const threadId = typeof meta.threadId === "string" ? meta.threadId : "";
      const externalThreadId =
        typeof meta.externalThreadId === "string" ? meta.externalThreadId : "";
      return [
        row.id,
        row.actorCompanyId ?? "",
        escapeCsv(platformCode),
        threadId,
        escapeCsv(externalThreadId),
        row.createdAt,
      ].join(",");
    });
    return [header, ...lines].join("\n");
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
