import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { parseRoadmapInterestPlatformCodes } from "./socialHubRoadmapInterest";
import { isRoadmapOAuthEnvConfigured } from "./socialHubRoadmapOAuthReadiness";

export type SocialHubRoadmapInterestPlatformStat = {
  platformCode: string;
  label: string;
  interestedCompanyCount: number;
  oauthEnvConfigured: boolean;
};

export type SocialHubRoadmapInterestStatsSnapshot = {
  interestedCompanyCount: number;
  platforms: SocialHubRoadmapInterestPlatformStat[];
};

@Injectable()
export class SocialHubRoadmapInterestStatsService {
  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
  ) {}

  public async buildSnapshot(): Promise<SocialHubRoadmapInterestStatsSnapshot> {
    const rows = await this.settingsRepository.find({
      select: ["companyId", "roadmapInterestPlatformCodesJson"],
    });
    const counts = new Map<string, number>();
    for (const provider of SOCIAL_HUB_ROADMAP_PROVIDERS) {
      counts.set(provider.platformCode, 0);
    }
    const companiesWithInterest = new Set<string>();
    for (const row of rows) {
      const codes = parseRoadmapInterestPlatformCodes(
        row.roadmapInterestPlatformCodesJson,
      );
      if (codes.length === 0) {
        continue;
      }
      companiesWithInterest.add(row.companyId);
      for (const code of codes) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    return {
      interestedCompanyCount: companiesWithInterest.size,
      platforms: SOCIAL_HUB_ROADMAP_PROVIDERS.map((provider) => ({
        platformCode: provider.platformCode,
        label: provider.label,
        interestedCompanyCount: counts.get(provider.platformCode) ?? 0,
        oauthEnvConfigured: isRoadmapOAuthEnvConfigured(provider.platformCode),
      })),
    };
  }
}
