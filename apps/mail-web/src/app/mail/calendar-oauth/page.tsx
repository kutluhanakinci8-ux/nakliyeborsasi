"use client";

import { useEffect, useState } from "react";
import { completeCalendarGraphOAuth } from "@/lib/mailApi";
import { readMailAccessToken } from "@/lib/mailAccessTokenStorage";

/** Microsoft Graph takvim OAuth — bağlantıyı callback sayfasında tamamlar. */
export default function CalendarGraphOAuthCallbackPage() {
  const [message, setMessage] = useState("Microsoft takvim oturumu işleniyor…");

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
        { type: "lerta-calendar-graph-oauth", ...payload },
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
        setMessage("Microsoft yanıtı eksik. Takvimden tekrar deneyin.");
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
        const result = await completeCalendarGraphOAuth(
          accessToken,
          code,
          state,
        );
        const email = result.account?.emailAddress ?? "";
        setMessage(
          email
            ? `${email} takvimi bağlandı. Pencere kapanıyor…`
            : "Outlook takvimi bağlandı.",
        );
        notifyOpener({ success: true, emailAddress: email });
        if (window.opener) {
          window.close();
        } else {
          window.location.replace("/mail");
        }
      } catch (error) {
        const err =
          error instanceof Error ? error.message : "Takvim bağlantısı başarısız.";
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
