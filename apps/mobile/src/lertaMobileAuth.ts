import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "lerta_mobile_access_token";

export function resolveApiBaseUrl(): string {
  const base =
    process.env.EXPO_PUBLIC_LERTA_API_URL?.trim() ??
    "https://api.lerta.com.tr/api/v1";
  return base.replace(/\/$/, "");
}

export async function getStoredAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearStoredAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function loginWithEmailPassword(
  emailAddress: string,
  password: string,
  options?: { oauthTokenEndpoint?: string | null },
): Promise<string> {
  const tokenEndpoint = options?.oauthTokenEndpoint?.trim();
  if (tokenEndpoint) {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: emailAddress.trim(),
        password,
      }).toString(),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      accessToken?: string;
      message?: string;
      error?: string;
    };
    const accessToken = payload.access_token ?? payload.accessToken;
    if (!response.ok || !accessToken) {
      throw new Error(
        payload.message ?? payload.error ?? "OAuth token isteği başarısız",
      );
    }
    await storeAccessToken(accessToken);
    return accessToken;
  }

  const response = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailAddress, password }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    accessToken?: string;
    message?: string;
  };
  if (!response.ok || !payload.accessToken) {
    const detail =
      payload.message ??
      (typeof payload === "object" ? JSON.stringify(payload) : "Giriş başarısız");
    throw new Error(detail);
  }
  await storeAccessToken(payload.accessToken);
  return payload.accessToken;
}

/** Geliştirme: EXPO_PUBLIC_LERTA_ACCESS_TOKEN hâlâ desteklenir. */
export async function resolveMobileAccessToken(): Promise<string | null> {
  const fromEnv = process.env.EXPO_PUBLIC_LERTA_ACCESS_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const stored = await getStoredAccessToken();
  if (stored) {
    return stored;
  }
  return null;
}

export function mobileAuthDiagnostics(): string {
  const hasEnv = Boolean(process.env.EXPO_PUBLIC_LERTA_ACCESS_TOKEN?.trim());
  return `API: ${resolveApiBaseUrl()} · platform: ${Platform.OS} · env JWT: ${
    hasEnv ? "var" : "yok"
  }`;
}
