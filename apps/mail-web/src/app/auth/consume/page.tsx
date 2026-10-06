"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMailSession } from "@/lib/session";
import { parseEmbedFromSearch } from "@/lib/embeddedParentSession";
import { postTokenRequestToEmbedParents } from "@/lib/embedParentOrigins";

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
      postTokenRequestToEmbedParents({ type: "lerta-mail-request-token" });
    }
    const search = new URLSearchParams(window.location.search);
    const composeTo = search.get("composeTo")?.trim();
    const mailView = search.get("mailView")?.trim();
    const customFolder = search.get("customFolder")?.trim();
    const compose = search.get("compose")?.trim();
    const composeRich = search.get("composeRich")?.trim();
    const composeTemplate = search.get("composeTemplate")?.trim();
    const composeMultipart = search.get("composeMultipart")?.trim();
    const mailSettings = search.get("mailSettings")?.trim();
    const mailBulk = search.get("mailBulk")?.trim();
    const mailSwipe = search.get("mailSwipe")?.trim();
    const mailDmarc = search.get("mailDmarc")?.trim();
    const query = new URLSearchParams();
    if (fromAddress) {
      query.set("welcome", fromAddress);
    }
    if (composeTo) {
      query.set("composeTo", composeTo);
    }
    if (mailView) {
      query.set("mailView", mailView);
    }
    if (customFolder) {
      query.set("customFolder", customFolder);
    }
    if (compose === "1") {
      query.set("compose", "1");
    }
    if (composeRich === "1" || composeRich === "0") {
      query.set("composeRich", composeRich);
    }
    if (composeTemplate) {
      query.set("composeTemplate", composeTemplate);
    }
    if (composeMultipart === "1") {
      query.set("composeMultipart", "1");
    }
    if (mailSettings) {
      query.set("mailSettings", mailSettings);
    }
    if (mailBulk === "1") {
      query.set("mailBulk", "1");
    }
    if (mailSwipe === "1") {
      query.set("mailSwipe", "1");
    }
    if (mailDmarc === "1") {
      query.set("mailDmarc", "1");
    }
    const qs = query.toString();
    router.replace(qs ? `/mail?${qs}` : "/mail");
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
