export function verifyYouTubePubSubPushAuth(params: {
  channelTokenHeader: string | undefined;
  authorizationHeader: string | undefined;
}): boolean {
  const expected = process.env.SOCIAL_YOUTUBE_WEBHOOK_CHANNEL_TOKEN?.trim();
  if (!expected) {
    return true;
  }
  const headerToken =
    params.channelTokenHeader?.trim() ??
    params.authorizationHeader?.trim().replace(/^Bearer\s+/i, "");
  if (!headerToken) {
    return false;
  }
  return headerToken === expected;
}
