"use client";

import { useEffect, useState } from "react";

/** Google Calendar OAuth callback — popup parent'a code iletir. */
export default function GoogleCalendarOAuthCallbackPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "lerta-google-calendar-oauth",
          code: code ?? undefined,
          oauthState: state ?? undefined,
          error: oauthError ?? undefined,
        },
        window.location.origin,
      );
      setDone(true);
      window.close();
    }
  }, []);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>
        {done
          ? "Google takvim bağlantısı tamamlandı, pencere kapanıyor…"
          : "Google oturumu işleniyor…"}
      </p>
    </main>
  );
}
