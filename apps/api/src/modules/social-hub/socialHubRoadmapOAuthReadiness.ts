export function isRoadmapOAuthEnvConfigured(platformCode: string): boolean {
  const code = platformCode.trim().toUpperCase();
  if (code === "TIKTOK") {
    return Boolean(
      process.env.SOCIAL_TIKTOK_OAUTH_CLIENT_ID?.trim() &&
        process.env.SOCIAL_TIKTOK_OAUTH_CLIENT_SECRET?.trim(),
    );
  }
  if (code === "YOUTUBE") {
    return Boolean(
      process.env.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID?.trim() &&
        process.env.SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET?.trim(),
    );
  }
  return false;
}
