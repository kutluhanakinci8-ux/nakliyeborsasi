"use client";

import { useEffect, useState } from "react";
import { completeCalendarGoogleOAuth } from "@/lib/mailApi";
import { readMailAccessToken } from "@/lib/mailAccessTokenStorage";

/** Google Calendar OAuth — bağlantıyı callback sayfasında tamamlar. */
export default function GoogleCalendarOAuthCallbackPage() {
  const [message, setMessage] = useState("Google oturumu işleniyor…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");

    const notifyOpener = (payload: {
      success: boolean;
      error?: string;
      emailAddress?: string;
    }) => {
      if (!window.opener) return;
      window.opener.postMessage(
        { type: "lerta-google-calendar-oauth", ...payload },
        window.location.origin,
      );
    };

    void (async () => {
      if (oauthError) {
        const err = oauthError;
        setMessage(`Bağlantı iptal edildi: ${err}`);
        notifyOpener({ success: false, error: err });
        return;
      }
      if (!code?.trim() || !state?.trim()) {
        setMessage("Google yanıtı eksik. Takvimden tekrar deneyin.");
        notifyOpener({ success: false, error: "missing_code" });
        return;
      }

      const accessToken = readMailAccessToken();
      if (!accessToken) {
        setMessage("Oturum bulunamadı. Giriş yapıp tekrar bağlayın.");
        notifyOpener({ success: false, error: "no_session" });
        return;
      }

      try {
        const result = await completeCalendarGoogleOAuth(
          accessToken,
          code,
          state,
        );
        const email = result.account?.emailAddress ?? "";
        setMessage(
          email
            ? `${email} Google takvimi bağlandı.`
            : "Google Takvim bağlandı.",
        );
        notifyOpener({ success: true, emailAddress: email });
        if (window.opener) {
          window.close();
        } else {
          window.location.replace("/mail");
        }
      } catch (error) {
        const err =
          error instanceof Error ? error.message : "Google bağlantısı başarısız.";
        setMessage(err);
        notifyOpener({ success: false, error: err });
      }
    })();
  }, []);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>{message}</p>
    </main>
  );
}
