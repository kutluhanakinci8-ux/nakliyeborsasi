import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./lertaMobileAuth";

export async function registerLertaExpoPushToken(
  accessToken: string,
  expoPushToken: string,
): Promise<boolean> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const response = await fetch(
    `${resolveApiBaseUrl()}/messaging/push/expo/register`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expoPushToken, platform }),
    },
  );
  return response.ok;
}
