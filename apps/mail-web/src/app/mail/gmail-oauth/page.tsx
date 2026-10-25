"use client";

import { useEffect, useState } from "react";
import { completeGmailOAuth } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

export default function GmailOAuthCallbackPage() {
  const { t } = useMailLocale();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(t("oauthGmailProcessing"));
  }, [t]);

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
      setMessage(t("oauthClosing"));
      window.close();
      return;
    }
    const token = localStorage.getItem("lerta_mail_access_token");
    if (oauthError) {
      setMessage(oauthError);
      return;
    }
    if (!token || !code || !state) {
      setMessage(t("oauthMissingParams"));
      return;
    }
    void completeGmailOAuth(token, code, state)
      .then(() => {
        setMessage(t("oauthGmailConnected"));
      })
      .catch((error) => {
        setMessage(
          error instanceof Error ? error.message : t("oauthConnectFailed"),
        );
      });
  }, [t]);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>{message}</p>
    </main>
  );
}
