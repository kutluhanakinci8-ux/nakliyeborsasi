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
  rnMeshMedia: {
    enabled: boolean;
    stack: "rn_peer_connection";
    globalInject: "LertaRnWebRTC";
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
    rnMeshMedia: {
      enabled: true,
      stack: "rn_peer_connection",
      globalInject: "LertaRnWebRTC",
    },
    hintTr:
      "Faz 23: RN mesh sinyal tüketimi + LertaRnWebRTC global ile peer connection.",
  };
}
