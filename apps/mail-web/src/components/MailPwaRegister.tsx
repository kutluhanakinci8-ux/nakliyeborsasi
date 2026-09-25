"use client";

import { useEffect } from "react";

export function MailPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* pilot: SW opsiyonel */
    });
  }, []);
  return null;
}
