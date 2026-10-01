import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubLinkedInGraphService } from "./oauth/SocialHubLinkedInGraphService";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import type { SocialHubPlatformInsightRow } from "./SocialHubMetaPlatformInsightsService";

const LINKEDIN_REST_HEADERS = {
  "X-Restli-Protocol-Version": "2.0.0",
} as const;

@Injectable()
export class SocialHubLinkedInOrgInsightsService {
  private readonly logger = new Logger(SocialHubLinkedInOrgInsightsService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly linkedInGraphService: SocialHubLinkedInGraphService,
  ) {}

  public async buildForCompany(
    companyId: string,
  ): Promise<SocialHubPlatformInsightRow> {
    const platformCode = SocialPlatformCode.LinkedIn;
    const base = {
      platformCode,
      label: labelSocialPlatform(platformCode),
      fetchedAt: new Date().toISOString(),
    };
    const connection = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (
      !connection ||
      connection.statusCode !== SocialConnectionStatusCode.Connected
    ) {
      return {
        ...base,
        status: "not_connected",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage: null,
      };
    }
    const accessToken = await this.tokenVault.getAccessToken(
      companyId,
      platformCode,
    );
    if (!accessToken) {
      return {
        ...base,
        status: "unavailable",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage: "OAuth token yok; LinkedIn kanalını yeniden bağlayın.",
      };
    }
    const metadata = parseSocialHubConnectionMetadata(connection.grantedScopes);
    let organizationUrn = metadata.linkedInOrganizationUrn ?? null;
    if (!organizationUrn) {
      organizationUrn =
        await this.linkedInGraphService.resolvePrimaryOrganizationUrn(
          accessToken,
        );
    }
    if (!organizationUrn) {
      return {
        ...base,
        status: "unavailable",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage:
          "Yönetici yetkili LinkedIn şirket sayfası bulunamadı (r_organization_social).",
      };
    }
    try {
      const followers = await this.fetchFollowerCount(
        organizationUrn,
        accessToken,
      );
      const share28d = await this.fetchShareStats28d(
        organizationUrn,
        accessToken,
      );
      if (followers == null && share28d.impressions28d == null) {
        return {
          ...base,
          status: "unavailable",
          followersCount: null,
          followingCount: null,
          mediaOrPostsCount: null,
          impressions28d: null,
          engagedUsers28d: null,
          errorMessage:
            share28d.errorMessage ??
            "LinkedIn sayfa istatistikleri alınamadı.",
        };
      }
      return {
        ...base,
        status: "ok",
        followersCount: followers,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: share28d.impressions28d,
        engagedUsers28d: share28d.engagement28d,
        errorMessage: null,
      };
    } catch (error) {
      this.logger.warn(
        `LinkedIn org insights failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        ...base,
        status: "unavailable",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage: "LinkedIn API isteği başarısız.",
      };
    }
  }

  private async fetchFollowerCount(
    organizationUrn: string,
    accessToken: string,
  ): Promise<number | null> {
    const url = new URL(
      "https://api.linkedin.com/v2/organizationalEntityFollowerStatistics",
    );
    url.searchParams.set("q", "organizationalEntity");
    url.searchParams.set("organizationalEntity", organizationUrn);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...LINKEDIN_REST_HEADERS,
      },
    });
    const payload = (await response.json()) as {
      elements?: Array<{
        followerCounts?: {
          organicFollowerCount?: number;
          paidFollowerCount?: number;
        };
      }>;
      message?: string;
    };
    if (!response.ok || !payload.elements?.length) {
      return null;
    }
    const counts = payload.elements[0]?.followerCounts;
    if (!counts) {
      return null;
    }
    const organic = counts.organicFollowerCount ?? 0;
    const paid = counts.paidFollowerCount ?? 0;
    return organic + paid;
  }

  private async fetchShareStats28d(
    organizationUrn: string,
    accessToken: string,
  ): Promise<{
    impressions28d: number | null;
    engagement28d: number | null;
    errorMessage: string | null;
  }> {
    const end = Date.now();
    const start = end - 28 * 24 * 60 * 60 * 1000;
    const url = new URL(
      "https://api.linkedin.com/v2/organizationalEntityShareStatistics",
    );
    url.searchParams.set("q", "organizationalEntity");
    url.searchParams.set("organizationalEntity", organizationUrn);
    url.searchParams.set(
      "timeIntervals.timeGranularityType",
      "DAY",
    );
    url.searchParams.set("timeIntervals.timeRange.start", String(start));
    url.searchParams.set("timeIntervals.timeRange.end", String(end));
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...LINKEDIN_REST_HEADERS,
      },
    });
    const payload = (await response.json()) as {
      elements?: Array<{
        totalShareStatistics?: {
          impressionCount?: number;
          clickCount?: number;
          likeCount?: number;
          commentCount?: number;
          shareCount?: number;
        };
      }>;
      message?: string;
    };
    if (!response.ok) {
      return {
        impressions28d: null,
        engagement28d: null,
        errorMessage: payload.message ?? "LinkedIn paylaşım istatistikleri yok.",
      };
    }
    let impressions28d = 0;
    let engagement28d = 0;
    let hasData = false;
    for (const element of payload.elements ?? []) {
      const stats = element.totalShareStatistics;
      if (!stats) {
        continue;
      }
      hasData = true;
      impressions28d += stats.impressionCount ?? 0;
      engagement28d +=
        (stats.clickCount ?? 0) +
        (stats.likeCount ?? 0) +
        (stats.commentCount ?? 0) +
        (stats.shareCount ?? 0);
    }
    if (!hasData) {
      return {
        impressions28d: null,
        engagement28d: null,
        errorMessage: null,
      };
    }
    return {
      impressions28d,
      engagement28d,
      errorMessage: null,
    };
  }
}
