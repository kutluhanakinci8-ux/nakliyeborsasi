import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { SocialHubRoadmapInterestStatsService } from "./SocialHubRoadmapInterestStatsService";

@Controller("platform-admin/social-hub")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class SocialHubPlatformAdminController {
  public constructor(
    private readonly roadmapInterestStatsService: SocialHubRoadmapInterestStatsService,
  ) {}

  @Get("roadmap-interest-stats")
  public async roadmapInterestStats() {
    return {
      snapshot:
        await this.roadmapInterestStatsService.buildSnapshot(),
    };
  }
}
