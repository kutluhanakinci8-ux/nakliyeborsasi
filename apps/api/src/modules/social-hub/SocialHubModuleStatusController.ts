import { Controller, Get } from "@nestjs/common";
import { SubscriptionModuleCode } from "@nakliyeborsasi/core";
import { buildSocialHubIntegrationWebhookReadiness } from "./socialHubIntegrationWebhookReadiness";
import { buildSocialHubPublicWebhookUrls } from "./socialHubIntegrationUrls";
import { buildSocialHubIntegrationOpsHints } from "./socialHubIntegrationOpsHints";
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "./SocialHubAuditService";
import { mapWebhookBridgedByPlatform } from "./socialHubWebhookBridgeSnapshot";
import { buildSocialHubLinkedInDmInboxGate } from "./socialHubLinkedInDmCapability";
import { ROADMAP_PENDING_SKELETON_PLATFORM_CODES } from "./socialHubRoadmapPendingProviders";
import {
  buildSocialHubModuleStatusFeatures,
  SOCIAL_HUB_PHASE_MILESTONE_CODES,
} from "./socialHubModuleStatusFeatures";

@Controller("company/social-hub")
export class SocialHubModuleStatusController {
  public constructor(private readonly auditService: SocialHubAuditService) {}

  @Get("status")
  public async getStatus(): Promise<{
    module: string;
    phase: string;
    subscriptionModuleCode: string;
    features: string[];
    integrationWebhookReadiness: ReturnType<
      typeof buildSocialHubIntegrationWebhookReadiness
    >;
    integrationWebhooks: ReturnType<typeof buildSocialHubPublicWebhookUrls>;
    integrationOpsHints: ReturnType<typeof buildSocialHubIntegrationOpsHints>;
    webhookBridge24h: {
      total: number;
      companiesActive24h: number;
      byPlatform: ReturnType<typeof mapWebhookBridgedByPlatform>;
    };
    webhookBridge7d: {
      total: number;
      companiesActive7d: number;
      byPlatform: ReturnType<typeof mapWebhookBridgedByPlatform>;
    };
    linkedinDmInboxGate: ReturnType<typeof buildSocialHubLinkedInDmInboxGate>;
    roadmapPendingProviders: string[];
    phaseMilestones: string[];
  }> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      total24h,
      bridgedByPlatform24h,
      companiesActive24h,
      total7d,
      bridgedByPlatform7d,
      companiesActive7d,
    ] = await Promise.all([
      this.auditService.countRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since24h,
      ),
      this.auditService.summarizeWebhookBridgedByPlatform(since24h),
      this.auditService.countDistinctCompaniesRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since24h,
      ),
      this.auditService.countRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since7d,
      ),
      this.auditService.summarizeWebhookBridgedByPlatform(since7d),
      this.auditService.countDistinctCompaniesRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since7d,
      ),
    ]);
    return {
      module: "social_hub",
      phase: "az",
      subscriptionModuleCode: SubscriptionModuleCode.SocialHub,
      features: buildSocialHubModuleStatusFeatures(),
      integrationWebhookReadiness: buildSocialHubIntegrationWebhookReadiness(),
      integrationWebhooks: buildSocialHubPublicWebhookUrls(),
      integrationOpsHints: buildSocialHubIntegrationOpsHints(),
      webhookBridge24h: {
        total: total24h,
        companiesActive24h,
        byPlatform: mapWebhookBridgedByPlatform(bridgedByPlatform24h),
      },
      webhookBridge7d: {
        total: total7d,
        companiesActive7d,
        byPlatform: mapWebhookBridgedByPlatform(bridgedByPlatform7d),
      },
      linkedinDmInboxGate: buildSocialHubLinkedInDmInboxGate(),
      roadmapPendingProviders: [...ROADMAP_PENDING_SKELETON_PLATFORM_CODES],
      phaseMilestones: [...SOCIAL_HUB_PHASE_MILESTONE_CODES],
    };
  }
}
