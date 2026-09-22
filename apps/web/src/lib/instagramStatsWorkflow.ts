import { AuthApiClient, type InstagramPublicStats } from "./AuthApiClient";
import {
  loadOrganizationProfile,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "./organizationProfile";

function formatCount(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "";
  }
  return String(value);
}

export function mergeInstagramStatsIntoProfile(
  profile: OrganizationProfile,
  stats: InstagramPublicStats,
  options: { overwrite: boolean },
): OrganizationProfile {
  const followers = formatCount(stats.followersCount);
  const following = formatCount(stats.followingCount);
  const posts = formatCount(stats.postsCount);
  const hasCounts = Boolean(followers || following || posts);

  return {
    ...profile,
    instagramFollowersCount:
      options.overwrite || !profile.instagramFollowersCount.trim()
        ? followers || profile.instagramFollowersCount
        : profile.instagramFollowersCount,
    instagramFollowingCount:
      options.overwrite || !profile.instagramFollowingCount.trim()
        ? following || profile.instagramFollowingCount
        : profile.instagramFollowingCount,
    instagramPostsCount:
      options.overwrite || !profile.instagramPostsCount.trim()
        ? posts || profile.instagramPostsCount
        : profile.instagramPostsCount,
    instagramStatsFetchedAt: hasCounts
      ? new Date().toISOString()
      : profile.instagramStatsFetchedAt,
    instagramStatsNote:
      stats.errorMessage ??
      (hasCounts ? "Instagram web API" : profile.instagramStatsNote),
  };
}

export async function refreshInstagramStatsForOrganization(
  companyId: string,
  primaryEmail: string,
  instagramUrl: string,
  overwrite = true,
): Promise<"success" | "partial" | "error"> {
  const url = instagramUrl.trim();
  if (!companyId || !url) {
    return "error";
  }
  try {
    const stats = await AuthApiClient.enrichInstagramStats(url);
    const profile = loadOrganizationProfile(companyId, primaryEmail);
    const next = mergeInstagramStatsIntoProfile(profile, stats, {
      overwrite,
    });
    saveOrganizationProfile(companyId, next);
    if (
      stats.followersCount !== null ||
      stats.followingCount !== null ||
      stats.postsCount !== null
    ) {
      return "success";
    }
    return stats.errorMessage ? "partial" : "error";
  } catch {
    return "error";
  }
}
