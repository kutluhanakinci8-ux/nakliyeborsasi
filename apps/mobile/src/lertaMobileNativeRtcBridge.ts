import * as WebBrowser from "expo-web-browser";
import { buildMeetHubUrl } from "./lertaMobileMeetHub";
import { postLertaNativeRtcBridgeHandshake } from "./lertaMobileWebRtcNativeBridgeApi";

export function buildNativeRtcMeetHubUrl(params?: {
  threadId?: string;
  bridgeId?: string;
}): string {
  const query = buildMeetHubUrl({
    threadId: params?.threadId,
    meetInvite: true,
    nativeRtc: true,
    sfuPilot: false,
  });
  if (!params?.bridgeId) {
    return query;
  }
  const separator = query.includes("?") ? "&" : "?";
  return `${query}${separator}bridgeId=${encodeURIComponent(params.bridgeId)}`;
}

export async function openNativeRtcMeetHub(params: {
  accessToken: string;
  threadId?: string;
  appVersion?: string;
}): Promise<void> {
  const handshake = await postLertaNativeRtcBridgeHandshake(
    params.accessToken,
    params.appVersion,
  );
  const url = buildNativeRtcMeetHubUrl({
    threadId: params.threadId,
    bridgeId: handshake?.bridgeId,
  });
  await WebBrowser.openBrowserAsync(url);
}
