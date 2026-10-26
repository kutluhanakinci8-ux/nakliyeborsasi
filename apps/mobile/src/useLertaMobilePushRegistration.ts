import { useCallback, useEffect, useState } from "react";
import { registerExpoMobilePushToken } from "./expoMobilePush";
import { registerLertaExpoPushToken } from "./lertaMobilePushApi";
import { resolveMobileAccessToken } from "./lertaMobileAuth";

export type MobilePushRegistrationState = {
  tokenPreview: string | null;
  serverState: string | null;
  refresh: () => Promise<void>;
};

export function useLertaMobilePushRegistration(
  accessToken: string | null,
): MobilePushRegistrationState {
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [serverState, setServerState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await registerExpoMobilePushToken();
    if (!token) {
      setTokenPreview(null);
      setServerState("Push izni verilmedi veya token alınamadı");
      return;
    }
    setTokenPreview(`${token.slice(0, 24)}…`);
    const jwt = accessToken ?? (await resolveMobileAccessToken());
    if (!jwt) {
      setServerState("API kaydı için giriş yapın (JWT)");
      return;
    }
    const ok = await registerLertaExpoPushToken(jwt, token);
    setServerState(ok ? "Push token API'ye kaydedildi" : "API kaydı başarısız");
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tokenPreview, serverState, refresh };
}
