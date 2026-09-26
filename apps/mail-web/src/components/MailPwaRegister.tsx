"use client";

import { useEffect } from "react";
import {
  isMailNotifySoundEnabled,
  playMailNotifyBeep,
} from "@/lib/mailNotifySound";

export function MailPwaRegister() {
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
