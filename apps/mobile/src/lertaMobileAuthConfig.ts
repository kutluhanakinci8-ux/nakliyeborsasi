import { resolveApiBaseUrl } from "./lertaMobileAuth";

export type RemoteMobileAuthConfig = {
  passwordLoginEnabled: boolean;
  passwordLoginPath: string;
  oauth: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    scopes: string[];
    authorizationEndpoint: string | null;
    tokenEndpoint: string | null;
  };
};

export async function fetchMobileAuthConfigFromApi(): Promise<RemoteMobileAuthConfig | null> {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/auth/mobile/config`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as RemoteMobileAuthConfig;
  } catch {
    return null;
  }
}
