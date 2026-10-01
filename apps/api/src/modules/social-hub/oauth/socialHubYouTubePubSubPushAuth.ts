import { verifyYouTubePubSubOidcAudience } from "./socialHubYouTubeOidcAudience";

export function verifyYouTubePubSubPushAuth(params: {
  channelTokenHeader: string | undefined;
  authorizationHeader: string | undefined;
}): boolean {
  const channelTokenExpected =
    process.env.SOCIAL_YOUTUBE_WEBHOOK_CHANNEL_TOKEN?.trim();
  const oidcAudience = process.env.SOCIAL_YOUTUBE_WEBHOOK_OIDC_AUDIENCE?.trim();
  if (!channelTokenExpected && !oidcAudience) {
    return true;
  }
  if (channelTokenExpected) {
    const headerToken =
      params.channelTokenHeader?.trim() ??
      params.authorizationHeader?.trim().replace(/^Bearer\s+/i, "");
    if (headerToken && headerToken === channelTokenExpected) {
      return true;
    }
  }
  if (
    oidcAudience &&
    verifyYouTubePubSubOidcAudience({
      authorizationHeader: params.authorizationHeader,
      expectedAudience: oidcAudience,
    })
  ) {
    return true;
  }
  return false;
}
