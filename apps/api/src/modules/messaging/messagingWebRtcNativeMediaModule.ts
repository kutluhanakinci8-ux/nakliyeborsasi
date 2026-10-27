export type RnWebRtcModuleStatus = "absent" | "linked_dev_client";

export type NativeSfuMediaMode = "webview_embed" | "native_planned";

export type MessagingWebRtcNativeMediaModuleSnapshot = {
  rnWebRtcTarget: "react_native_webrtc";
  rnWebRtcStatus: RnWebRtcModuleStatus;
  sfuMediaMode: NativeSfuMediaMode;
  capabilitiesPath: string;
  nativeMeshPilot: {
    enabled: boolean;
    pathTemplate: string;
    requiresRnWebRtc: true;
  };
  hintTr: string;
};

export function defaultNativeMediaModuleSnapshot(): MessagingWebRtcNativeMediaModuleSnapshot {
  return {
    rnWebRtcTarget: "react_native_webrtc",
    rnWebRtcStatus: "absent",
    sfuMediaMode: "webview_embed",
    capabilitiesPath: "/messaging/webrtc/native-bridge/capabilities",
    nativeMeshPilot: {
      enabled: true,
      pathTemplate: "/messaging/webrtc/threads/{threadId}/native-pilot/session",
      requiresRnWebRtc: true,
    },
    hintTr:
      "Native mesh pilot (Faz 22): linked_dev_client capabilities + thread oturum API.",
  };
}
