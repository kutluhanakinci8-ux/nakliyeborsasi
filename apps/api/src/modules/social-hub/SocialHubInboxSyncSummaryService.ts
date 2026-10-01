import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialProviderRegistry } from "./providers/SocialProviderRegistry";
import { getSocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import { getRoadmapProviderCapabilities } from "./socialHubRoadmapCapabilities";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import { buildSocialHubLinkedInDmInboxGate } from "./socialHubLinkedInDmCapability";
import { SocialHubAuditService } from "./SocialHubAuditService";
import { mapWebhookBridgedByPlatform } from "./socialHubWebhookBridgeSnapshot";
import type {
  SocialHubInboxChannelSyncRow,
  SocialHubInboxSyncSummary,
} from "./socialHubInboxSyncSummary";

@Injectable()
export class SocialHubInboxSyncSummaryService {
  public constructor(
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly socialProviderRegistry: SocialProviderRegistry,
    private readonly socialHubAuditService: SocialHubAuditService,
  ) {}

  public async buildForCompany(companyId: string): Promise<SocialHubInboxSyncSummary> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [openLinks, connections, bridgedRaw, lastSyncByPlatform] =
      await Promise.all([
        this.threadLinkRepository.find({
          where: { companyId, isOpen: true },
        }),
        this.connectionRepository.find({ where: { companyId } }),
        this.socialHubAuditService.summarizeWebhookBridgedByPlatform(
          since24h,
          companyId,
        ),
        this.socialHubAuditService.listLatestInboxSyncByPlatform(companyId),
      ]);
    const bridgedByPlatform = mapWebhookBridgedByPlatform(bridgedRaw);
    const webhookCount = new Map(
      bridgedByPlatform.map((row) => [row.platformCode, row.inboundBridged24h]),
    );
    const connectionByCode = new Map(
      connections.map((row) => [row.platformCode, row]),
    );
    const platformCodes = [
      ...this.socialProviderRegistry.listPlatforms(),
      ...SOCIAL_HUB_ROADMAP_PROVIDERS.map((p) => p.platformCode),
    ];
    const channels: SocialHubInboxChannelSyncRow[] = platformCodes.map(
      (platformCode) => {
        const provider = this.socialProviderRegistry
          .listPlatforms()
          .includes(platformCode as SocialPlatformCode)
          ? this.socialProviderRegistry.resolve(platformCode as SocialPlatformCode)
          : null;
        const roadmapProvider = SOCIAL_HUB_ROADMAP_PROVIDERS.find(
          (p) => p.platformCode === platformCode,
        );
        const caps =
          provider
            ? getSocialHubProviderCapabilities(
                platformCode as SocialPlatformCode,
              )
            : roadmapProvider
              ? getRoadmapProviderCapabilities(platformCode)
              : { inboxWebhook: false, inboxHistorySync: false };
        const connection = connectionByCode.get(platformCode);
        const lastSync = lastSyncByPlatform.get(platformCode);
        const linkedInGate =
          platformCode === SocialPlatformCode.LinkedIn
            ? buildSocialHubLinkedInDmInboxGate()
            : null;
        return {
          platformCode,
          label: labelSocialPlatform(platformCode),
          openCount: openLinks.filter((l) => l.platformCode === platformCode)
            .length,
          webhookInboundBridged24h: webhookCount.get(platformCode) ?? 0,
          providerImplementationStatus:
            provider?.getImplementationStatus() ??
            roadmapProvider?.implementationStatus ??
            "pending",
          connectionStatusCode: connection?.statusCode ?? null,
          inboxWebhook: caps.inboxWebhook,
          inboxHistorySync: caps.inboxHistorySync,
          lastSyncAt: lastSync?.createdAt.toISOString() ?? null,
          lastSyncMessage: lastSync?.message ?? null,
          lastSyncImplementationStatus: lastSync?.implementationStatus ?? null,
          dmInboxGateLabel: linkedInGate?.userFacingLabel ?? null,
        };
      },
    );
    return {
      generatedAt: new Date().toISOString(),
      channels,
    };
  }
}
