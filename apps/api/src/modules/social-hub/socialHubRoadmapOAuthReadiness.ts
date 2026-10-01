export function isRoadmapOAuthEnvConfigured(platformCode: string): boolean {
  const code = platformCode.trim().toUpperCase();
  if (code === "TIKTOK") {
    return Boolean(process.env.SOCIAL_TIKTOK_OAUTH_CLIENT_ID?.trim());
  }
  if (code === "YOUTUBE") {
    return Boolean(process.env.SOCIAL_YOUTUBE_OAUTH_CLIENT_ID?.trim());
  }
  return false;
}
