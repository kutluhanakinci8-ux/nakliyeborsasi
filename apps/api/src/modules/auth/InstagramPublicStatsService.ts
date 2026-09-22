import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ValidationException } from "@nakliyeborsasi/core";
import { InstagramPublicStatsResult } from "./InstagramPublicStatsResult";

const FETCH_TIMEOUT_MS = 12_000;
const IG_APP_ID = "936619743392459";

export type InstagramGraphConnectionStatus = {
  configured: boolean;
  actorId: string | null;
  mode: "env" | "none";
};

@Injectable()
export class InstagramPublicStatsService {
  public constructor(private readonly configService: ConfigService) {}

  public getGraphConnectionStatus(): InstagramGraphConnectionStatus {
    const token = this.configService.get<string>("META_GRAPH_ACCESS_TOKEN");
    const actorId =
      this.configService.get<string>("META_INSTAGRAM_ACTOR_ID") ?? null;
    const configured = Boolean(token?.trim() && actorId?.trim());
    return {
      configured,
      actorId: configured ? actorId : null,
      mode: configured ? "env" : "none",
    };
  }

  public async fetchFromProfileUrl(
    rawUrl: string,
  ): Promise<InstagramPublicStatsResult> {
    const username = this.parseUsername(rawUrl);
    if (!username) {
      throw new ValidationException("Geçerli bir Instagram profil adresi gerekli");
    }

    const graphResult = await this.fetchViaMetaGraph(username);
    if (graphResult) {
      return graphResult;
    }

    return this.fetchViaPublicWebApi(username);
  }

  private async fetchViaMetaGraph(
    username: string,
  ): Promise<InstagramPublicStatsResult | null> {
    const token = this.configService.get<string>("META_GRAPH_ACCESS_TOKEN");
    const actorId = this.configService.get<string>("META_INSTAGRAM_ACTOR_ID");
    if (!token?.trim() || !actorId?.trim()) {
      return null;
    }

    const discoveryField = `business_discovery.username(${username}){username,followers_count,follows_count,media_count}`;
    const url = new URL(`https://graph.facebook.com/v21.0/${actorId}`);
    url.searchParams.set("fields", discoveryField);
    url.searchParams.set("access_token", token);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = (await response.json()) as {
        business_discovery?: {
          username?: string;
          followers_count?: number;
          follows_count?: number;
          media_count?: number;
        };
        error?: { message?: string };
      };

      if (!response.ok || payload.error || !payload.business_discovery) {
        return {
          username,
          followersCount: null,
          followingCount: null,
          postsCount: null,
          source: "unavailable",
          errorMessage:
            payload.error?.message ??
            "Meta Graph üzerinden istatistik alınamadı. Token veya hesap izinlerini kontrol edin.",
        };
      }

      const discovery = payload.business_discovery;
      return {
        username: discovery.username ?? username,
        followersCount: discovery.followers_count ?? null,
        followingCount: discovery.follows_count ?? null,
        postsCount: discovery.media_count ?? null,
        source: "meta_graph",
        errorMessage: null,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchViaPublicWebApi(
    username: string,
  ): Promise<InstagramPublicStatsResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
        {
          signal: controller.signal,
          headers: {
            "x-ig-app-id": IG_APP_ID,
            "x-asbd-id": "129477",
            Accept: "*/*",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        },
      );
      const payload = (await response.json()) as {
        status?: string;
        message?: string;
        require_login?: boolean;
        data?: {
          user?: {
            edge_followed_by?: { count?: number };
            edge_follow?: { count?: number };
            edge_owner_to_timeline_media?: { count?: number };
          };
        };
      };

      if (payload.require_login) {
        return {
          username,
          followersCount: null,
          followingCount: null,
          postsCount: null,
          source: "unavailable",
          errorMessage:
            "Anonim tarama engellendi. Meta Business hesabınızı platforma bağlayın (Graph API).",
        };
      }

      if (payload.status === "fail" || !payload.data?.user) {
        return {
          username,
          followersCount: null,
          followingCount: null,
          postsCount: null,
          source: "unavailable",
          errorMessage:
            payload.message ??
            "Instagram istatistikleri alınamadı. İşletme hesabı için Meta bağlantısı gerekir.",
        };
      }

      const user = payload.data.user;
      return {
        username,
        followersCount: user.edge_followed_by?.count ?? null,
        followingCount: user.edge_follow?.count ?? null,
        postsCount: user.edge_owner_to_timeline_media?.count ?? null,
        source: "web_profile_info",
        errorMessage: null,
      };
    } catch {
      return {
        username,
        followersCount: null,
        followingCount: null,
        postsCount: null,
        source: "unavailable",
        errorMessage:
          "Instagram bağlantısı kurulamadı. Meta Graph token yapılandırmasını kullanın.",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private parseUsername(rawUrl: string): string | null {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return null;
    }
    if (!trimmed.includes("instagram.com") && !trimmed.includes("@")) {
      return /^[a-zA-Z0-9._]+$/.test(trimmed) ? trimmed : null;
    }
    try {
      const withScheme = trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed.replace(/^@/, "")}`;
      const path = new URL(withScheme).pathname.replace(/\/+$/, "");
      const segments = path.split("/").filter(Boolean);
      const first = segments[0];
      if (!first || ["p", "reel", "reels", "stories", "explore"].includes(first)) {
        return null;
      }
      return first;
    } catch {
      return null;
    }
  }
}
