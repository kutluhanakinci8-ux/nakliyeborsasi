import React, { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as AuthSession from "expo-auth-session";
import { OpenSourceLegalScreen } from "./OpenSourceLegalScreen";
import {
  clearStoredAccessToken,
  loginWithEmailPassword,
  mobileAuthDiagnostics,
  resolveMobileAccessToken,
} from "./lertaMobileAuth";
import { useLertaMobilePushRegistration } from "./useLertaMobilePushRegistration";
import {
  loginWithOAuthIfConfigured,
  resolveMobileOAuthConfig,
} from "./lertaMobileOAuth";
import { fetchMobileAuthConfigFromApi } from "./lertaMobileAuthConfig";
import type { RemoteMobileAuthConfig } from "./lertaMobileAuthConfig";
import {
  openMeetMessagingHub,
  parseMeetDeepLinkFromUrl,
} from "./lertaMobileMeetHub";
import { openNativeRtcMeetHub } from "./lertaMobileNativeRtcBridge";
import { NativeMeetMeshPilotPanel } from "./NativeMeetMeshPilotPanel";
import * as Linking from "expo-linking";

/** OAuth redirect — AppAuth / expo-auth-session (W6). */
export const MOBILE_OAUTH_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "lerta",
});

type Screen = "home" | "legal";

export function MobileApplicationRoot(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>("home");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [remoteAuthConfig, setRemoteAuthConfig] =
    useState<RemoteMobileAuthConfig | null>(null);

  const loadSession = useCallback(async () => {
    const token = await resolveMobileAccessToken();
    setAccessToken(token);
  }, []);

  React.useEffect(() => {
    void loadSession();
  }, [loadSession]);

  React.useEffect(() => {
    void fetchMobileAuthConfigFromApi().then(setRemoteAuthConfig);
  }, []);

  React.useEffect(() => {
    if (!accessToken) {
      return;
    }
    function handleUrl(url: string): void {
      const parsed = parseMeetDeepLinkFromUrl(url);
      if (parsed.nativeRtc && accessToken) {
        void openNativeRtcMeetHub({
          accessToken,
          threadId: parsed.threadId ?? undefined,
        });
        return;
      }
      if (parsed.meetInvite) {
        void openMeetMessagingHub({ threadId: parsed.threadId ?? undefined });
      }
    }
    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });
    const sub = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });
    return () => sub.remove();
  }, [accessToken]);

  const push = useLertaMobilePushRegistration(accessToken);
  const oauthConfigured =
    resolveMobileOAuthConfig(remoteAuthConfig) !== null;

  async function handleLogin(): Promise<void> {
    setLoginError(null);
    setLoginBusy(true);
    try {
      const token = await loginWithEmailPassword(email.trim(), password, {
        oauthTokenEndpoint: remoteAuthConfig?.oauth.tokenEndpoint,
      });
      setAccessToken(token);
      setPassword("");
      await push.refresh();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Giriş hatası");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleOAuthLogin(): Promise<void> {
    setLoginError(null);
    setLoginBusy(true);
    try {
      const token = await loginWithOAuthIfConfigured(
        MOBILE_OAUTH_REDIRECT_URI,
        remoteAuthConfig,
      );
      if (!token) {
        setLoginError("OAuth yapılandırılmadı");
        return;
      }
      setAccessToken(token);
      await push.refresh();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "OAuth hatası");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout(): Promise<void> {
    await clearStoredAccessToken();
    setAccessToken(null);
    setLoginError(null);
  }

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
        {mobileAuthDiagnostics()}
      </Text>
      <Text style={styles.hint} selectable>
        OAuth redirect: {MOBILE_OAUTH_REDIRECT_URI}
      </Text>

      {accessToken ? (
        <Text style={styles.hint}>Oturum: aktif (JWT)</Text>
      ) : (
        <View style={styles.loginBox}>
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={[styles.button, loginBusy && styles.buttonDisabled]}
            onPress={() => void handleLogin()}
            disabled={loginBusy}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {loginBusy ? "Giriş…" : "Giriş yap"}
            </Text>
          </Pressable>
          {loginError ? (
            <Text style={styles.error} accessibilityRole="alert">
              {loginError}
            </Text>
          ) : null}
          {oauthConfigured ? (
            <Pressable
              style={[styles.buttonSecondary, loginBusy && styles.buttonDisabled]}
              onPress={() => void handleOAuthLogin()}
              disabled={loginBusy}
              accessibilityRole="button"
            >
              <Text style={styles.buttonSecondaryText}>OAuth ile giriş</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {accessToken ? (
        <>
          <Pressable
            style={styles.button}
            onPress={() => void openMeetMessagingHub()}
            accessibilityRole="button"
            accessibilityLabel="Mesajlaşma hub görüşme"
          >
            <Text style={styles.buttonText}>Mesajlaşma / Meet (web)</Text>
          </Pressable>
          <Pressable
            style={styles.buttonSecondary}
            onPress={() => {
              if (!accessToken) {
                return;
              }
              void openNativeRtcMeetHub({ accessToken });
            }}
            accessibilityRole="button"
            accessibilityLabel="Native RTC köprü beta"
          >
            <Text style={styles.buttonSecondaryText}>
              Meet native köprü (beta)
            </Text>
          </Pressable>
          <NativeMeetMeshPilotPanel accessToken={accessToken} />
          <Pressable
            style={styles.buttonSecondary}
            onPress={() => void handleLogout()}
            accessibilityRole="button"
          >
            <Text style={styles.buttonSecondaryText}>Çıkış</Text>
          </Pressable>
        </>
      ) : null}

      {push.tokenPreview ? (
        <Text style={styles.hint} selectable>
          Push (Expo/FCM) token: {push.tokenPreview}
        </Text>
      ) : null}
      {push.serverState ? (
        <Text style={styles.hint}>{push.serverState}</Text>
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
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  loginBox: {
    width: "100%",
    maxWidth: 360,
    marginVertical: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    width: "100%",
  },
  button: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  buttonSecondaryText: {
    color: "#555",
    fontSize: 14,
  },
  error: {
    color: "#b00020",
    fontSize: 13,
    marginTop: 4,
  },
});
