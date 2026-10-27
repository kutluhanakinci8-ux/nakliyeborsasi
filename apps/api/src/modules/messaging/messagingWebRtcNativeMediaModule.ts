export type RnWebRtcModuleStatus = "absent" | "linked_dev_client";

export type NativeSfuMediaMode = "webview_embed" | "native_planned";

export type MessagingWebRtcNativeMediaModuleSnapshot = {
  rnWebRtcTarget: "react_native_webrtc";
  rnWebRtcStatus: RnWebRtcModuleStatus;
  sfuMediaMode: NativeSfuMediaMode;
  capabilitiesPath: string;
  hintTr: string;
};

export function defaultNativeMediaModuleSnapshot(): MessagingWebRtcNativeMediaModuleSnapshot {
  return {
    rnWebRtcTarget: "react_native_webrtc",
    rnWebRtcStatus: "absent",
    sfuMediaMode: "webview_embed",
    capabilitiesPath: "/messaging/webrtc/native-bridge/capabilities",
    hintTr:
      "Expo handoff aktif; react-native-webrtc dev client build ile Faz 22+ native medya.",
  };
}
