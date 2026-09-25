"use client";

import { useEffect } from "react";

export function MailHttpsRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const { protocol, hostname, href } = window.location;
    if (
      protocol === "http:" &&
      (hostname === "posta.lerta.com.tr" || hostname.endsWith(".posta.lerta.com.tr"))
    ) {
      window.location.replace(href.replace(/^http:/, "https:"));
    }
  }, []);
  return null;
}
