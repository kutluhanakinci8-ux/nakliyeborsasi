import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { SocialHubRoadmapInterestStatsService } from "./SocialHubRoadmapInterestStatsService";
import { SocialHubRoadmapBetaOpsStatsService } from "./SocialHubRoadmapBetaOpsStatsService";

@Controller("platform-admin/social-hub")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class SocialHubPlatformAdminController {
  public constructor(
    private readonly roadmapInterestStatsService: SocialHubRoadmapInterestStatsService,
    private readonly roadmapBetaOpsStatsService: SocialHubRoadmapBetaOpsStatsService,
  ) {}

  @Get("roadmap-interest-stats")
  public async roadmapInterestStats() {
    return {
      snapshot:
        await this.roadmapInterestStatsService.buildSnapshot(),
    };
  }

  @Get("roadmap-beta-ops.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  public async roadmapBetaOpsCsv(): Promise<string> {
    const snapshot = await this.roadmapBetaOpsStatsService.buildSnapshot();
    return this.roadmapBetaOpsStatsService.buildCsv(snapshot);
  }
}
