import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { storeAccessToken } from "./lertaMobileAuth";

WebBrowser.maybeCompleteAuthSession();

export type MobileOAuthConfig = {
  issuer: string;
  clientId: string;
  scopes: string[];
};

export function resolveMobileOAuthConfig(): MobileOAuthConfig | null {
  const issuer = process.env.EXPO_PUBLIC_LERTA_OAUTH_ISSUER?.trim();
  const clientId = process.env.EXPO_PUBLIC_LERTA_OAUTH_CLIENT_ID?.trim();
  if (!issuer || !clientId) {
    return null;
  }
  const scopes =
    process.env.EXPO_PUBLIC_LERTA_OAUTH_SCOPES?.split(/[\s,]+/).filter(Boolean) ??
    ["openid", "profile", "email"];
  return { issuer, clientId, scopes };
}

/**
 * OIDC authorization code + PKCE (issuer'da mobile client tanımlı olmalı).
 * Token yanıtında `access_token` veya API JWT alanı beklenir.
 */
export async function loginWithOAuthIfConfigured(
  redirectUri: string,
): Promise<string | null> {
  const config = resolveMobileOAuthConfig();
  if (!config) {
    return null;
  }
  const discovery = await AuthSession.fetchDiscoveryAsync(config.issuer);
  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    scopes: config.scopes,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });
  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);
  if (result.type !== "success" || !result.params.code) {
    throw new Error("OAuth iptal edildi veya kod alınamadı");
  }
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? "",
      },
    },
    discovery,
  );
  const accessToken =
    tokenResponse.accessToken ??
    (tokenResponse as { access_token?: string }).access_token;
  if (!accessToken) {
    throw new Error("OAuth token yanıtında access token yok");
  }
  await storeAccessToken(accessToken);
  return accessToken;
}
