import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { parseRoadmapInterestPlatformCodes } from "./socialHubRoadmapInterest";
import { isRoadmapOAuthEnvConfigured } from "./socialHubRoadmapOAuthReadiness";
import {
  SocialHubRoadmapBetaOpsStatsService,
  type SocialHubRoadmapBetaOpsSnapshot,
} from "./SocialHubRoadmapBetaOpsStatsService";

export type SocialHubRoadmapInterestPlatformStat = {
  platformCode: string;
  label: string;
  interestedCompanyCount: number;
  oauthEnvConfigured: boolean;
};

export type SocialHubRoadmapInterestStatsSnapshot = {
  interestedCompanyCount: number;
  platforms: SocialHubRoadmapInterestPlatformStat[];
  betaOps: SocialHubRoadmapBetaOpsSnapshot;
};

@Injectable()
export class SocialHubRoadmapInterestStatsService {
  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    private readonly roadmapBetaOpsStatsService: SocialHubRoadmapBetaOpsStatsService,
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
    const betaOps = await this.roadmapBetaOpsStatsService.buildSnapshot();
    return {
      interestedCompanyCount: companiesWithInterest.size,
      platforms: SOCIAL_HUB_ROADMAP_PROVIDERS.map((provider) => ({
        platformCode: provider.platformCode,
        label: provider.label,
        interestedCompanyCount: counts.get(provider.platformCode) ?? 0,
        oauthEnvConfigured: isRoadmapOAuthEnvConfigured(provider.platformCode),
      })),
      betaOps,
    };
  }

  public buildInterestCsv(snapshot: SocialHubRoadmapInterestStatsSnapshot): string {
    const header = "platformCode,label,interestedCompanyCount,oauthEnvConfigured";
    const lines = snapshot.platforms.map((row) =>
      [
        row.platformCode,
        escapeCsv(row.label),
        row.interestedCompanyCount,
        row.oauthEnvConfigured ? "1" : "0",
      ].join(","),
    );
    return [header, `summary,interestedCompanies,${snapshot.interestedCompanyCount},`].concat(lines).join("\n");
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
