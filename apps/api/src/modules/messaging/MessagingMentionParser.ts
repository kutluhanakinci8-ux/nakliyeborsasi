const mentionPattern =
  /@\{([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\}/gi;

export function parseMessagingMentionUserIds(bodyText: string): string[] {
  const ids = new Set<string>();
  for (const match of bodyText.matchAll(mentionPattern)) {
    ids.add(match[1].toLowerCase());
  }
  return [...ids];
}
