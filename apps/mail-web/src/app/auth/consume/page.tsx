"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMailSession } from "@/lib/session";
import { parseEmbedFromSearch } from "@/lib/embeddedParentSession";

function ConsumeHandoff() {
  const router = useRouter();
  const { setAccessToken } = useMailSession();
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const fromAddress = params.get("from");
    if (!token) {
      setError("Oturum bağlantısı geçersiz veya süresi doldu.");
      return;
    }
    setAccessToken(token);
    const embedded =
      parseEmbedFromSearch(window.location.search) ||
      window.parent !== window;
    if (embedded) {
      try {
        window.parent.postMessage(
          { type: "lerta-mail-request-token" },
          "https://app.lerta.com.tr",
        );
      } catch {
        /* ignore */
      }
    }
    const target = fromAddress
      ? `/mail?welcome=${encodeURIComponent(fromAddress)}`
      : "/mail";
    router.replace(target);
  }, [router, setAccessToken]);

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="login-error">{error}</p>
          <a href="/login">Giriş sayfasına git</a>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p>Webmail açılıyor…</p>
      </div>
    </div>
  );
}

export default function AuthConsumePage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card">
            <p>Yükleniyor…</p>
          </div>
        </div>
      }
    >
      <ConsumeHandoff />
    </Suspense>
  );
}
