import {
  defaultNativeMediaModuleSnapshot,
  type MessagingWebRtcNativeMediaModuleSnapshot,
} from "./messagingWebRtcNativeMediaModule";

export type MessagingWebRtcNativeBridgeSnapshot = {
  enabled: true;
  mode: "expo_webview_handoff";
  deepLinkParam: "nativeRtc";
  meshInWebView: true;
  sfuPilotInWebView: true;
  handshakePath: string;
  hintTr: string;
  mediaModule: MessagingWebRtcNativeMediaModuleSnapshot;
};

export function summarizeMessagingWebRtcNativeBridge(): MessagingWebRtcNativeBridgeSnapshot {
  return {
    enabled: true,
    mode: "expo_webview_handoff",
    deepLinkParam: "nativeRtc",
    meshInWebView: true,
    sfuPilotInWebView: true,
    handshakePath: "/messaging/webrtc/native-bridge/handshake",
    hintTr:
      "Expo uygulaması WebView/handoff ile tam tarayıcı Meet pilotunu açar; RN WebRTC modül durumu capabilities API ile raporlanır.",
    mediaModule: defaultNativeMediaModuleSnapshot(),
  };
}
