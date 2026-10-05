import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import {
  parseSocialHubConnectionMetadata,
  usesInstagramLoginApi,
} from "./oauth/SocialHubConnectionMetadata";
import { labelSocialPlatform } from "./socialHubPlatformLabels";

export type SocialHubPlatformInsightRow = {
  platformCode: string;
  label: string;
  status: "ok" | "unavailable" | "not_connected";
  followersCount: number | null;
  followingCount: number | null;
  mediaOrPostsCount: number | null;
  impressions28d: number | null;
  engagedUsers28d: number | null;
  errorMessage: string | null;
  fetchedAt: string;
};

const GRAPH_VERSION = "v21.0";

@Injectable()
export class SocialHubMetaPlatformInsightsService {
  private readonly logger = new Logger(SocialHubMetaPlatformInsightsService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaGraphService: SocialHubMetaGraphService,
  ) {}

  public async buildForCompany(
    companyId: string,
  ): Promise<SocialHubPlatformInsightRow[]> {
    const targets = [
      SocialPlatformCode.Instagram,
      SocialPlatformCode.FacebookMessenger,
    ];
    const rows: SocialHubPlatformInsightRow[] = [];
    for (const platformCode of targets) {
      rows.push(await this.fetchForPlatform(companyId, platformCode));
    }
    return rows;
  }

  private async fetchForPlatform(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<SocialHubPlatformInsightRow> {
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
    const userToken = await this.tokenVault.getAccessToken(
      companyId,
      platformCode,
    );
    if (!userToken) {
      return {
        ...base,
        status: "unavailable",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage: "OAuth token yok; kanalı yeniden bağlayın.",
      };
    }
    const metadata = parseSocialHubConnectionMetadata(connection.grantedScopes);
    try {
      if (
        platformCode === SocialPlatformCode.Instagram &&
        usesInstagramLoginApi(metadata)
      ) {
        const igStats = await this.fetchInstagramLoginProfileStats(userToken);
        if (!igStats.ok) {
          return {
            ...base,
            status: "unavailable",
            followersCount: null,
            followingCount: null,
            mediaOrPostsCount: null,
            impressions28d: null,
            engagedUsers28d: null,
            errorMessage: igStats.errorMessage,
          };
        }
        return {
          ...base,
          status: "ok",
          followersCount: igStats.followersCount,
          followingCount: igStats.followingCount,
          mediaOrPostsCount: igStats.mediaCount,
          impressions28d: null,
          engagedUsers28d: null,
          errorMessage: null,
        };
      }
    const pageId = metadata.pageId ?? connection.externalAccountId ?? null;
    if (!pageId) {
      return {
        ...base,
        status: "unavailable",
        followersCount: null,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage: "Meta sayfa kimliği bulunamadı.",
      };
    }
    const pageToken =
      (await this.metaGraphService.resolvePageAccessToken(userToken, pageId)) ??
      userToken;
      if (platformCode === SocialPlatformCode.Instagram) {
        const igId = metadata.instagramBusinessAccountId;
        if (!igId) {
          return {
            ...base,
            status: "unavailable",
            followersCount: null,
            followingCount: null,
            mediaOrPostsCount: null,
            impressions28d: null,
            engagedUsers28d: null,
            errorMessage:
              "Instagram Business hesap kimliği yok; OAuth yenileyin.",
          };
        }
        const igStats = await this.fetchInstagramUserStats(igId, pageToken);
        if (!igStats.ok) {
          return {
            ...base,
            status: "unavailable",
            followersCount: null,
            followingCount: null,
            mediaOrPostsCount: null,
            impressions28d: null,
            engagedUsers28d: null,
            errorMessage: igStats.errorMessage,
          };
        }
        const reach = await this.fetchIgInsightsReach28d(igId, pageToken);
        return {
          ...base,
          status: "ok",
          followersCount: igStats.followersCount,
          followingCount: igStats.followingCount,
          mediaOrPostsCount: igStats.mediaCount,
          impressions28d: reach.impressions28d,
          engagedUsers28d: reach.engagedUsers28d,
          errorMessage: null,
        };
      }
      const pageStats = await this.fetchFacebookPageStats(pageId, pageToken);
      return {
        ...base,
        status: pageStats.ok ? "ok" : "unavailable",
        followersCount: pageStats.followersCount,
        followingCount: null,
        mediaOrPostsCount: null,
        impressions28d: pageStats.impressions28d,
        engagedUsers28d: pageStats.engagedUsers28d,
        errorMessage: pageStats.ok ? null : pageStats.errorMessage,
      };
    } catch (error) {
      this.logger.warn(
        `Platform insights failed ${platformCode}: ${
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
        errorMessage: "Meta Graph isteği başarısız.",
      };
    }
  }

  /** Instagram API with Instagram Login — graph.instagram.com/me */
  private async fetchInstagramLoginProfileStats(accessToken: string): Promise<{
    ok: boolean;
    followersCount: number | null;
    followingCount: number | null;
    mediaCount: number | null;
    errorMessage: string | null;
  }> {
    const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
    url.searchParams.set(
      "fields",
      "followers_count,follows_count,media_count,username",
    );
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as {
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (!response.ok || payload.error) {
      return {
        ok: false,
        followersCount: null,
        followingCount: null,
        mediaCount: null,
        errorMessage:
          payload.error?.message ?? "Instagram profil istatistikleri alınamadı.",
      };
    }
    return {
      ok: true,
      followersCount: payload.followers_count ?? null,
      followingCount: payload.follows_count ?? null,
      mediaCount: payload.media_count ?? null,
      errorMessage: null,
    };
  }

  private async fetchInstagramUserStats(
    igUserId: string,
    accessToken: string,
  ): Promise<{
    ok: boolean;
    followersCount: number | null;
    followingCount: number | null;
    mediaCount: number | null;
    errorMessage: string | null;
  }> {
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}`);
    url.searchParams.set(
      "fields",
      "followers_count,follows_count,media_count,username",
    );
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as {
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (!response.ok || payload.error) {
      return {
        ok: false,
        followersCount: null,
        followingCount: null,
        mediaCount: null,
        errorMessage:
          payload.error?.message ?? "Instagram profil istatistikleri alınamadı.",
      };
    }
    return {
      ok: true,
      followersCount: payload.followers_count ?? null,
      followingCount: payload.follows_count ?? null,
      mediaCount: payload.media_count ?? null,
      errorMessage: null,
    };
  }

  private async fetchIgInsightsReach28d(
    igUserId: string,
    accessToken: string,
  ): Promise<{ impressions28d: number | null; engagedUsers28d: number | null }> {
    const url = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/insights`,
    );
    url.searchParams.set("metric", "impressions,reach");
    url.searchParams.set("period", "days_28");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as {
      data?: Array<{
        name?: string;
        values?: Array<{ value?: number }>;
      }>;
      error?: { message?: string };
    };
    if (!response.ok || payload.error || !payload.data) {
      return { impressions28d: null, engagedUsers28d: null };
    }
    let impressions28d: number | null = null;
    let engagedUsers28d: number | null = null;
    for (const row of payload.data) {
      const total = (row.values ?? []).reduce(
        (sum, entry) => sum + (entry.value ?? 0),
        0,
      );
      if (row.name === "impressions") {
        impressions28d = total;
      }
      if (row.name === "reach") {
        engagedUsers28d = total;
      }
    }
    return { impressions28d, engagedUsers28d };
  }

  private async fetchFacebookPageStats(
    pageId: string,
    accessToken: string,
  ): Promise<{
    ok: boolean;
    followersCount: number | null;
    impressions28d: number | null;
    engagedUsers28d: number | null;
    errorMessage: string | null;
  }> {
    const profileUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}`,
    );
    profileUrl.searchParams.set("fields", "fan_count,followers_count");
    profileUrl.searchParams.set("access_token", accessToken);
    const profileRes = await fetch(profileUrl.toString());
    const profile = (await profileRes.json()) as {
      fan_count?: number;
      followers_count?: number;
      error?: { message?: string };
    };
    const insightsUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/insights`,
    );
    insightsUrl.searchParams.set(
      "metric",
      "page_impressions,page_post_engagements",
    );
    insightsUrl.searchParams.set("period", "days_28");
    insightsUrl.searchParams.set("access_token", accessToken);
    const insightsRes = await fetch(insightsUrl.toString());
    const insightsPayload = (await insightsRes.json()) as {
      data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
    };
    if (!profileRes.ok || profile.error) {
      return {
        ok: false,
        followersCount: null,
        impressions28d: null,
        engagedUsers28d: null,
        errorMessage:
          profile.error?.message ?? "Facebook sayfa istatistikleri alınamadı.",
      };
    }
    let impressions28d: number | null = null;
    let engagedUsers28d: number | null = null;
    for (const row of insightsPayload.data ?? []) {
      const total = (row.values ?? []).reduce(
        (sum, entry) => sum + (entry.value ?? 0),
        0,
      );
      if (row.name === "page_impressions") {
        impressions28d = total;
      }
      if (row.name === "page_post_engagements") {
        engagedUsers28d = total;
      }
    }
    return {
      ok: true,
      followersCount: profile.followers_count ?? profile.fan_count ?? null,
      impressions28d,
      engagedUsers28d,
      errorMessage: null,
    };
  }
}
