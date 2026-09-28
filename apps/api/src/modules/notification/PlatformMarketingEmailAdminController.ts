import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { EmailMarketingApplicationService } from "./EmailMarketingApplicationService";
import { EmailMarketingAudienceService } from "./EmailMarketingAudienceService";
import type { EmailMarketingSegmentDefinition } from "../../infrastructure/database/entities/EmailMarketingSegmentEntity";

@Controller("platform-admin/marketing-email")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformMarketingEmailAdminController {
  public constructor(
    private readonly marketingService: EmailMarketingApplicationService,
    private readonly audienceService: EmailMarketingAudienceService,
  ) {}

  @Get("segments")
  public async listSegments() {
    const segments = await this.marketingService.listSegments();
    return { segments };
  }

  @Post("segments")
  public async createSegment(
    @Body() body: { name: string; definition: EmailMarketingSegmentDefinition },
  ) {
    const segment = await this.marketingService.createSegment(body);
    return { segment };
  }

  @Get("segments/:segmentId/preview")
  public async previewSegment(@Param("segmentId") segmentId: string) {
    return { preview: await this.audienceService.previewSegment(segmentId) };
  }

  @Get("campaigns")
  public async listCampaigns() {
    const campaigns = await this.marketingService.listCampaigns();
    return { campaigns };
  }

  @Post("campaigns")
  public async createCampaign(
    @Body()
    body: {
      name: string;
      segmentId: string;
      subjectA: string;
      subjectB?: string;
      abTestEnabled?: boolean;
      htmlBody: string;
      textBody: string;
    },
  ) {
    const campaign = await this.marketingService.createCampaign(body);
    return { campaign };
  }

  @Post("campaigns/:campaignId/send")
  public async sendCampaign(@Param("campaignId") campaignId: string) {
    const campaign = await this.marketingService.sendCampaign(campaignId);
    return { campaign };
  }

  @Get("campaigns/:campaignId/analytics")
  public async campaignAnalytics(@Param("campaignId") campaignId: string) {
    return {
      analytics: await this.marketingService.getCampaignAnalytics(campaignId),
    };
  }
}
