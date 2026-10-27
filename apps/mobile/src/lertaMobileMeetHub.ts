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
  sfuPilot?: boolean;
  nativeRtc?: boolean;
  nativePilot?: boolean;
}): string {
  const query = new URLSearchParams({ tab: "chat" });
  if (params?.threadId) {
    query.set("threadId", params.threadId);
  }
  if (params?.meetInvite) {
    query.set("meet", "1");
  }
  if (params?.sfuPilot) {
    query.set("sfuPilot", "1");
  }
  if (params?.nativeRtc) {
    query.set("nativeRtc", "1");
  }
  if (params?.nativePilot) {
    query.set("nativePilot", "1");
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

export async function openSfuPilotMessagingHub(params?: {
  threadId?: string;
}): Promise<void> {
  await WebBrowser.openBrowserAsync(
    buildMeetHubUrl({
      threadId: params?.threadId,
      meetInvite: true,
      sfuPilot: true,
    }),
  );
}

export function parseMeetDeepLinkFromUrl(
  url: string,
): {
  threadId: string | null;
  meetInvite: boolean;
  sfuPilot: boolean;
  nativeRtc: boolean;
} {
  try {
    const parsed = Linking.parse(url);
    const threadId =
      typeof parsed.queryParams?.threadId === "string"
        ? parsed.queryParams.threadId
        : null;
    const meetInvite = parsed.queryParams?.meet === "1";
    const sfuPilot = parsed.queryParams?.sfuPilot === "1";
    const nativeRtc = parsed.queryParams?.nativeRtc === "1";
    return { threadId, meetInvite, sfuPilot, nativeRtc };
  } catch {
    return { threadId: null, meetInvite: false, sfuPilot: false, nativeRtc: false };
  }
}
