import { Platform } from "react-native";

function resolveApiBaseUrl(): string {
  const base =
    process.env.EXPO_PUBLIC_LERTA_API_URL?.trim() ??
    "https://api.lerta.com.tr/api/v1";
  return base.replace(/\/$/, "");
}

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
