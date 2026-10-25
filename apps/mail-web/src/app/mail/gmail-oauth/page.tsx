"use client";

import { useEffect, useState } from "react";
import { completeGmailOAuth } from "@/lib/mailApi";

export default function GmailOAuthCallbackPage() {
  const [message, setMessage] = useState("Gmail oturumu işleniyor…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "lerta-gmail-oauth",
          code: code ?? undefined,
          oauthState: state ?? undefined,
          error: oauthError ?? undefined,
        },
        window.location.origin,
      );
      setMessage("Tamamlandı, pencere kapanıyor…");
      window.close();
      return;
    }
    const token = localStorage.getItem("lerta_mail_access_token");
    if (oauthError) {
      setMessage(oauthError);
      return;
    }
    if (!token || !code || !state) {
      setMessage("Oturum veya OAuth parametreleri eksik.");
      return;
    }
    void completeGmailOAuth(token, code, state)
      .then(() => {
        setMessage("Gmail bağlandı. Ayarlar sayfasına dönebilirsiniz.");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Bağlantı başarısız.");
      });
  }, []);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>{message}</p>
    </main>
  );
}
