import type {
  NativeSfuMediaMode,
  RnWebRtcModuleStatus,
} from "./lertaMobileWebRtcCapabilityTypes";

export function detectRnWebRtcModuleStatus(): RnWebRtcModuleStatus {
  if (process.env.EXPO_PUBLIC_RN_WEBRTC_LINKED === "1") {
    return "linked_dev_client";
  }
  return "absent";
}

export function resolveNativeSfuMediaMode(): NativeSfuMediaMode {
  return "webview_embed";
}
