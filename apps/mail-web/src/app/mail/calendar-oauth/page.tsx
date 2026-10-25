"use client";

import { useEffect, useState } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";

/** Microsoft Graph takvim OAuth callback — popup parent'a code iletir. */
export default function CalendarGraphOAuthCallbackPage() {
  const { t } = useMailLocale();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(t("oauthCalGraphProcessing"));
  }, [t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "lerta-calendar-graph-oauth",
          code: code ?? undefined,
          oauthState: state ?? undefined,
          error: oauthError ?? undefined,
        },
        window.location.origin,
      );
      setDone(true);
      setMessage(t("oauthCalGraphDone"));
      window.close();
    }
  }, [t]);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>{done ? message || t("oauthCalGraphDone") : message}</p>
    </main>
  );
}
