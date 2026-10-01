export type SocialHubInboxThreadPreviewRow = {
  threadId: string;
  platformCode: string;
  platformLabel: string;
  displayLabel: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOpen: boolean;
  messagingDeepLink: string;
};

export function buildSocialInboxThreadDeepLink(threadId: string): string {
  const params = new URLSearchParams({
    tab: "sohbet",
    filter: "social",
    threadId,
  });
  return `/messaging?${params.toString()}`;
}
