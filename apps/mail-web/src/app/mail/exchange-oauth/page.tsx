"use client";

import { useEffect, useState } from "react";

/** OAuth redirect target — popup parent'a code iletir. */
export default function ExchangeOAuthCallbackPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "lerta-exchange-oauth",
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
      <p>{done ? "Tamamlandı, pencere kapanıyor…" : "Microsoft oturumu işleniyor…"}</p>
    </main>
  );
}
