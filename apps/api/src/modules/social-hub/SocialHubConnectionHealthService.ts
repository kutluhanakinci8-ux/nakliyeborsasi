import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialProviderRegistry } from "./providers/SocialProviderRegistry";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { getSocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { hasLinkedInRefreshToken } from "./oauth/socialHubLinkedInRefreshToken";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { isRoadmapOAuthEnvConfigured } from "./socialHubRoadmapOAuthReadiness";
import { hasRoadmapRefreshToken } from "./oauth/socialHubRoadmapRefreshToken";

import { roadmapConnectedHint } from "./socialHubRoadmapHints";

const EXPIRY_LOOKAHEAD_MS = 7 * 24 * 60 * 60 * 1000;

const PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp Business",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

export type TokenHealthCode = "ok" | "expiring_soon" | "expired" | "missing";

@Injectable()
export class SocialHubConnectionHealthService {
  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly socialProviderRegistry: SocialProviderRegistry,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
  ) {}

  public async buildHealthDashboard(companyId: string) {
    const connections = await this.connectionRepository.find({
      where: { companyId },
    });
    const openLinks = await this.threadLinkRepository.find({
      where: { companyId, isOpen: true },
    });
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const channels = this.socialProviderRegistry.listPlatforms().map(
      (platformCode) => {
        const row = connections.find((c) => c.platformCode === platformCode);
        const provider = this.socialProviderRegistry.resolve(platformCode);
        const oauthServerReady = provider.getImplementationStatus() === "ready";
        const setupWarnings = this.collectSetupWarnings(
          platformCode,
          row,
          oauthServerReady,
        );
        const tokenHealth = this.resolveTokenHealth(row);
        const platformLinks = openLinks.filter(
          (link) => link.platformCode === platformCode,
        );
        const lastOutboundLink = platformLinks
          .filter((link) => link.lastOutboundAt)
          .sort(
            (a, b) =>
              (b.lastOutboundAt?.getTime() ?? 0) -
              (a.lastOutboundAt?.getTime() ?? 0),
          )[0];
        return {
          platformCode,
          label: PLATFORM_LABELS[platformCode],
          statusCode: row?.statusCode ?? SocialConnectionStatusCode.Disconnected,
          tokenHealth,
          tokenExpiresAt: row?.tokenExpiresAt?.toISOString() ?? null,
          setupWarnings,
          openThreadCount: platformLinks.length,
          lastOutboundStatus: lastOutboundLink?.lastOutboundStatus ?? null,
          lastOutboundAt: lastOutboundLink?.lastOutboundAt?.toISOString() ?? null,
          recentOutboundFailures24h: row
            ? 0
            : 0,
          oauthServerReady,
          capabilities: getSocialHubProviderCapabilities(platformCode),
          canRefreshToken:
            row?.statusCode === SocialConnectionStatusCode.Connected &&
            (platformCode !== SocialPlatformCode.LinkedIn ||
              hasLinkedInRefreshToken(row?.grantedScopes)),
          linkedInRefreshAvailable:
            platformCode === SocialPlatformCode.LinkedIn &&
            hasLinkedInRefreshToken(row?.grantedScopes),
        };
      },
    );
    for (const channel of channels) {
      if (channel.statusCode === SocialConnectionStatusCode.Connected) {
        channel.recentOutboundFailures24h =
          await this.deliveryLogService.countRecentFailures(
            companyId,
            channel.platformCode,
            since24h,
          );
      }
    }
    const roadmapChannels = SOCIAL_HUB_ROADMAP_PROVIDERS.map((provider) => {
      const row = connections.find(
        (c) => c.platformCode === provider.platformCode,
      );
      const tokenHealth = this.resolveTokenHealth(row);
      const setupWarnings: string[] = [];
      if (!isRoadmapOAuthEnvConfigured(provider.platformCode)) {
        setupWarnings.push("Platform OAuth ortam değişkenleri eksik.");
      }
      if (row?.statusCode === SocialConnectionStatusCode.Connected) {
        setupWarnings.push(roadmapConnectedHint(provider.platformCode));
      }
      if (
        row &&
        row.statusCode === SocialConnectionStatusCode.Connected &&
        !hasRoadmapRefreshToken(row.grantedScopes)
      ) {
        setupWarnings.push(
          "Refresh token yok — süre dolunca yeniden OAuth gerekir.",
        );
      }
      if (row?.lastErrorMessage) {
        setupWarnings.push(row.lastErrorMessage);
      }
      if (
        row?.tokenExpiresAt &&
        row.tokenExpiresAt.getTime() < Date.now() + EXPIRY_LOOKAHEAD_MS
      ) {
        setupWarnings.push("Token yakında sona eriyor — yenileyin.");
      }
      const platformLinks = openLinks.filter(
        (link) => link.platformCode === provider.platformCode,
      );
      const lastOutboundLink = platformLinks
        .filter((link) => link.lastOutboundAt)
        .sort(
          (a, b) =>
            (b.lastOutboundAt?.getTime() ?? 0) -
            (a.lastOutboundAt?.getTime() ?? 0),
        )[0];
      return {
        platformCode: provider.platformCode,
        label: provider.label,
        statusCode: row?.statusCode ?? SocialConnectionStatusCode.Disconnected,
        tokenHealth,
        tokenExpiresAt: row?.tokenExpiresAt?.toISOString() ?? null,
        setupWarnings,
        openThreadCount: platformLinks.length,
        lastOutboundStatus: lastOutboundLink?.lastOutboundStatus ?? null,
        lastOutboundAt: lastOutboundLink?.lastOutboundAt?.toISOString() ?? null,
        recentOutboundFailures24h: 0,
        oauthServerReady: isRoadmapOAuthEnvConfigured(provider.platformCode),
        canRefreshToken:
          row?.statusCode === SocialConnectionStatusCode.Connected &&
          hasRoadmapRefreshToken(row.grantedScopes),
        isRoadmapBeta: true,
      };
    });
    for (const channel of roadmapChannels) {
      if (channel.statusCode === SocialConnectionStatusCode.Connected) {
        channel.recentOutboundFailures24h =
          await this.deliveryLogService.countRecentFailures(
            companyId,
            channel.platformCode,
            since24h,
          );
      }
    }
    const overallStatus = this.resolveOverallStatus([
      ...channels,
      ...roadmapChannels,
    ]);
    return {
      generatedAt: new Date().toISOString(),
      overallStatus,
      channels,
      roadmapChannels,
    };
  }

  private resolveOverallStatus(
    channels: Array<{
      statusCode: string;
      tokenHealth: TokenHealthCode;
      setupWarnings: string[];
      recentOutboundFailures24h: number;
    }>,
  ): "healthy" | "attention" | "critical" {
    const connected = channels.filter(
      (c) => c.statusCode === SocialConnectionStatusCode.Connected,
    );
    if (connected.length === 0) {
      return "attention";
    }
    const critical = connected.some(
      (c) =>
        c.tokenHealth === "expired" ||
        c.tokenHealth === "missing" ||
        c.statusCode === SocialConnectionStatusCode.Error ||
        c.statusCode === SocialConnectionStatusCode.TokenExpired,
    );
    if (critical) {
      return "critical";
    }
    const attention = connected.some(
      (c) =>
        c.tokenHealth === "expiring_soon" ||
        c.setupWarnings.length > 0 ||
        c.recentOutboundFailures24h > 0,
    );
    return attention ? "attention" : "healthy";
  }

  private resolveTokenHealth(
    row: CompanySocialConnectionEntity | undefined,
  ): TokenHealthCode {
    if (!row || row.statusCode !== SocialConnectionStatusCode.Connected) {
      return "missing";
    }
    if (!row.tokenExpiresAt) {
      return "ok";
    }
    const ms = row.tokenExpiresAt.getTime() - Date.now();
    if (ms <= 0) {
      return "expired";
    }
    if (ms < 7 * 24 * 60 * 60 * 1000) {
      return "expiring_soon";
    }
    return "ok";
  }

  private collectSetupWarnings(
    platform: SocialPlatformCode,
    row: CompanySocialConnectionEntity | undefined,
    oauthServerReady: boolean,
  ): string[] {
    const warnings: string[] = [];
    if (!oauthServerReady) {
      warnings.push("Sunucu OAuth yapılandırması eksik.");
    }
    if (!row || row.statusCode !== SocialConnectionStatusCode.Connected) {
      return warnings;
    }
    const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
    if (platform === SocialPlatformCode.WhatsAppCloud && !metadata.phoneNumberId) {
      warnings.push("WhatsApp phone_number_id eksik — OAuth yenileyin.");
    }
    if (
      platform === SocialPlatformCode.Instagram &&
      !metadata.instagramBusinessAccountId
    ) {
      warnings.push("Instagram işletme hesabı tanımlı değil.");
    }
    if (
      platform === SocialPlatformCode.LinkedIn &&
      !hasLinkedInRefreshToken(row.grantedScopes)
    ) {
      warnings.push(
        "LinkedIn refresh token yok — süre dolunca yeniden bağlanmanız gerekir.",
      );
    }
    if (
      row.tokenExpiresAt &&
      row.tokenExpiresAt.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000
    ) {
      warnings.push("Token yakında sona eriyor — yenileyin veya yeniden bağlanın.");
    }
    if (row.lastErrorMessage) {
      warnings.push(row.lastErrorMessage);
    }
    return warnings;
  }
}
