import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

const DEFAULT_WEB_BASE = "https://app.lerta.com.tr";

export function resolveLertaWebBase(): string {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_LERTA_WEB_BASE === "string"
      ? process.env.EXPO_PUBLIC_LERTA_WEB_BASE.trim()
      : "";
  return (fromEnv || DEFAULT_WEB_BASE).replace(/\/$/, "");
}

export function buildMeetHubUrl(params?: {
  threadId?: string;
  meetInvite?: boolean;
}): string {
  const query = new URLSearchParams({ tab: "chat" });
  if (params?.threadId) {
    query.set("threadId", params.threadId);
  }
  if (params?.meetInvite) {
    query.set("meet", "1");
  }
  return `${resolveLertaWebBase()}/messaging?${query.toString()}`;
}

export async function openMeetMessagingHub(params?: {
  threadId?: string;
}): Promise<void> {
  await WebBrowser.openBrowserAsync(
    buildMeetHubUrl({ threadId: params?.threadId, meetInvite: true }),
  );
}

export function parseMeetDeepLinkFromUrl(
  url: string,
): { threadId: string | null; meetInvite: boolean } {
  try {
    const parsed = Linking.parse(url);
    const threadId =
      typeof parsed.queryParams?.threadId === "string"
        ? parsed.queryParams.threadId
        : null;
    const meetInvite = parsed.queryParams?.meet === "1";
    return { threadId, meetInvite };
  } catch {
    return { threadId: null, meetInvite: false };
  }
}
