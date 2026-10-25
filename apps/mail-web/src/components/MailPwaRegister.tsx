"use client";

import { useEffect } from "react";
import {
  isMailNotifySoundEnabled,
  playMailNotifyBeep,
} from "@/lib/mailNotifySound";

function isStaleDeployChunkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("loading chunk") ||
    m.includes("chunkloaderror") ||
    m.includes("failed to fetch dynamically imported module")
  );
}

export function MailPwaRegister() {
  useEffect(() => {
    const onChunkFailure = (event: ErrorEvent) => {
      const message = event.message || String(event.error ?? "");
      if (!isStaleDeployChunkError(message)) {
        return;
      }
      const key = "lerta-mail-chunk-reload";
      if (sessionStorage.getItem(key) === "1") {
        return;
      }
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };
    window.addEventListener("error", onChunkFailure);
    return () => window.removeEventListener("error", onChunkFailure);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const sha =
      process.env.NEXT_PUBLIC_DEPLOY_SHA?.trim() || "dev";
    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(sha)}`, { updateViaCache: "none" })
      .then((reg) => {
        void reg.update();
      })
      .catch(() => {
        /* pilot: SW opsiyonel */
      });
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "lerta-mail-push" &&
        isMailNotifySoundEnabled()
      ) {
        playMailNotifyBeep();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);
  return null;
}
