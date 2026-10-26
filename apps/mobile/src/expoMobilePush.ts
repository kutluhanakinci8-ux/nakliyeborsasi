import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** FCM (Android) / APNs (iOS) — Expo push token; sunucu kaydı sonraki faz. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: Platform.OS === "ios",
    shouldSetBadge: false,
  }),
});

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerExpoMobilePushToken(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Lerta",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return null;
  }

  const projectId = resolveExpoProjectId();
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return null;
  }
}
