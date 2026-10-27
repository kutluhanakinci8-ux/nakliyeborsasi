import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingWebRtcNativeMediaModule = {
  rnWebRtcTarget: "react_native_webrtc";
  rnWebRtcStatus: "absent" | "linked_dev_client";
  sfuMediaMode: "webview_embed" | "native_planned";
  capabilitiesPath: string;
  nativeMeshPilot?: {
    enabled: boolean;
    pathTemplate: string;
    requiresRnWebRtc: true;
  };
  rnMeshMedia?: {
    enabled: boolean;
    stack: "rn_peer_connection";
    globalInject: "LertaRnWebRTC";
  };
  rnRemoteVideo?: {
    enabled: boolean;
    rtcViewGlobal: "RTCView";
    backgroundPausePoll: boolean;
  };
  hintTr: string;
};

export type MessagingWebRtcNativeBridgeConfig = {
  enabled: true;
  mode: "expo_webview_handoff";
  deepLinkParam: "nativeRtc";
  meshInWebView: true;
  sfuPilotInWebView: true;
  handshakePath: string;
  hintTr: string;
  mediaModule: MessagingWebRtcNativeMediaModule;
};

export type MessagingWebRtcNativeBridgeCapabilities = {
  rnWebRtcModule: "absent" | "linked_dev_client";
  sfuMediaMode: "webview_embed" | "native_planned";
  reportedAt: string;
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

export async function fetchMessagingWebRtcNativeBridgeCapabilities(
  accessToken: string,
): Promise<{
  capabilities: MessagingWebRtcNativeBridgeCapabilities | null;
  mediaModule: MessagingWebRtcNativeMediaModule;
}> {
  const response = await fetch(
    `${apiBase()}/messaging/webrtc/native-bridge/capabilities`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("native bridge capabilities");
  }
  return (await response.json()) as {
    capabilities: MessagingWebRtcNativeBridgeCapabilities | null;
    mediaModule: MessagingWebRtcNativeMediaModule;
  };
}
