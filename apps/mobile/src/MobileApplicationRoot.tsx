import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as AuthSession from "expo-auth-session";
import { OpenSourceLegalScreen } from "./OpenSourceLegalScreen";
import { registerExpoMobilePushToken } from "./expoMobilePush";
import { registerLertaExpoPushToken } from "./lertaMobilePushApi";

/** OAuth redirect — AppAuth / expo-auth-session (W6). */
export const MOBILE_OAUTH_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "lerta",
});

type Screen = "home" | "legal";

export function MobileApplicationRoot(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>("home");
  const [pushTokenPreview, setPushTokenPreview] = useState<string | null>(null);
  const [pushServerState, setPushServerState] = useState<string | null>(null);

  useEffect(() => {
    void registerExpoMobilePushToken().then(async (token) => {
      if (!token) {
        return;
      }
      setPushTokenPreview(`${token.slice(0, 24)}…`);
      const accessToken = process.env.EXPO_PUBLIC_LERTA_ACCESS_TOKEN?.trim();
      if (!accessToken) {
        setPushServerState("API kaydı için oturum (JWT) gerekli");
        return;
      }
      const ok = await registerLertaExpoPushToken(accessToken, token);
      setPushServerState(ok ? "Push token API'ye kaydedildi" : "API kaydı başarısız");
    });
  }, []);

  if (screen === "legal") {
    return <OpenSourceLegalScreen onBack={() => setScreen("home")} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lerta Logistics Mobile</Text>
      <Text style={styles.sub}>
        Expo / React Native — posta ve mesajlaşma (JWT API)
      </Text>
      <Text style={styles.hint} selectable>
        OAuth redirect: {MOBILE_OAUTH_REDIRECT_URI}
      </Text>
      {pushTokenPreview ? (
        <Text style={styles.hint} selectable>
          Push (Expo/FCM) token: {pushTokenPreview}
        </Text>
      ) : null}
      {pushServerState ? (
        <Text style={styles.hint}>{pushServerState}</Text>
      ) : null}
      <Pressable
        style={styles.button}
        onPress={() => setScreen("legal")}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Açık kaynak lisansları</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: "#5c6370",
    textAlign: "center",
    marginBottom: 12,
  },
  hint: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#0f4c81",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
