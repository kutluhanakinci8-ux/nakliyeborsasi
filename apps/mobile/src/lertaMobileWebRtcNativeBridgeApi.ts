import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./lertaMobileAuth";

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
