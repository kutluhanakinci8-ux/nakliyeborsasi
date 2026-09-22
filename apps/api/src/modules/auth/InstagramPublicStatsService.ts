import { Injectable } from "@nestjs/common";
import { ValidationException } from "@nakliyeborsasi/core";
import { InstagramPublicStatsResult } from "./InstagramPublicStatsResult";

const FETCH_TIMEOUT_MS = 12_000;
const IG_APP_ID = "936619743392459";

@Injectable()
export class InstagramPublicStatsService {
  public async fetchFromProfileUrl(
    rawUrl: string,
  ): Promise<InstagramPublicStatsResult> {
    const username = this.parseUsername(rawUrl);
    if (!username) {
      throw new ValidationException("Geçerli bir Instagram profil adresi gerekli");
    }

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
        data?: {
          user?: {
            edge_followed_by?: { count?: number };
            edge_follow?: { count?: number };
            edge_owner_to_timeline_media?: { count?: number };
          };
        };
      };

      if (payload.status === "fail" || !payload.data?.user) {
        return {
          username,
          followersCount: null,
          followingCount: null,
          postsCount: null,
          source: "unavailable",
          errorMessage:
            payload.message ??
            "Instagram istatistikleri alınamadı (işletme hesabı veya erişim kısıtı).",
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
        errorMessage: "Instagram bağlantısı kurulamadı.",
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
