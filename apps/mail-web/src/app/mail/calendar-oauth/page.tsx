"use client";

import { useEffect, useState } from "react";

/** Microsoft Graph takvim OAuth callback — popup parent'a code iletir. */
export default function CalendarGraphOAuthCallbackPage() {
  const [done, setDone] = useState(false);

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
      window.close();
    }
  }, []);

  return (
    <main className="mail-exchange-oauth-callback">
      <p>
        {done
          ? "Takvim bağlantısı tamamlandı, pencere kapanıyor…"
          : "Microsoft takvim oturumu işleniyor…"}
      </p>
    </main>
  );
}
