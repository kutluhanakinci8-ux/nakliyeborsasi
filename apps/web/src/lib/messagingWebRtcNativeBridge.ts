import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingWebRtcNativeBridgeConfig = {
  enabled: true;
  mode: "expo_webview_handoff";
  deepLinkParam: "nativeRtc";
  meshInWebView: true;
  sfuPilotInWebView: true;
  handshakePath: string;
  hintTr: string;
};

function apiBase(): string {
  return PublicApiConfiguration.resolveBaseUrl().replace(/\/$/, "");
}

export async function fetchMessagingWebRtcNativeBridgeConfig(
  accessToken: string,
): Promise<MessagingWebRtcNativeBridgeConfig> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/native-bridge/config`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("native bridge config");
  }
  const body = (await response.json()) as {
    config: MessagingWebRtcNativeBridgeConfig;
  };
  return body.config;
}
