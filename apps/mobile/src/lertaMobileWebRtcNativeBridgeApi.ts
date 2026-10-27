import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./lertaMobileAuth";
import {
  detectRnWebRtcModuleStatus,
  resolveNativeSfuMediaMode,
} from "./lertaMobileWebRtcCapabilities";
import type { RnWebRtcModuleStatus } from "./lertaMobileWebRtcCapabilityTypes";

export async function postLertaNativeRtcBridgeCapabilities(
  accessToken: string,
): Promise<RnWebRtcModuleStatus | null> {
  const rnWebRtcModule = detectRnWebRtcModuleStatus();
  const sfuMediaMode = resolveNativeSfuMediaMode();
  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/messaging/webrtc/native-bridge/capabilities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rnWebRtcModule, sfuMediaMode }),
      },
    );
    if (!response.ok) {
      return null;
    }
    return rnWebRtcModule;
  } catch {
    return null;
  }
}

export async function postLertaNativeRtcBridgeHandshake(
  accessToken: string,
  appVersion?: string,
): Promise<{ bridgeId: string } | null> {
  const platform = Platform.OS === "ios" || Platform.OS === "android" ? "expo" : "web";
  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/messaging/webrtc/native-bridge/handshake`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          ...(appVersion ? { appVersion } : {}),
        }),
      },
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { bridgeId: string };
    return { bridgeId: body.bridgeId };
  } catch {
    return null;
  }
}
