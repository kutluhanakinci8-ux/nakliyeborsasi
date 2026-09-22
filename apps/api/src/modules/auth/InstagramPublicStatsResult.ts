export type InstagramPublicStatsResult = {
  username: string | null;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  source: "web_profile_info" | "unavailable";
  errorMessage: string | null;
};
