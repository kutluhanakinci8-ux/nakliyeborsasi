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
    void navigator.serviceWorker.register("/sw.js").catch(() => {
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
