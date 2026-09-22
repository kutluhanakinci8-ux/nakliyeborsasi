export type InstagramPublicStatsResult = {
  username: string | null;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  source: "meta_graph" | "web_profile_info" | "unavailable";
  errorMessage: string | null;
};
