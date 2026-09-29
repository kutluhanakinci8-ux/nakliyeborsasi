"use client";

import { useEffect } from "react";

const RELOAD_SESSION_KEY = "nb-chunk-reload-once";

function isChunkLoadFailure(message: string): boolean {
  return /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
    message,
  );
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const hadReload = sessionStorage.getItem(RELOAD_SESSION_KEY);
    if (hadReload) {
      window.setTimeout(() => sessionStorage.removeItem(RELOAD_SESSION_KEY), 15_000);
    }

    function tryRecover(reason: string): void {
      if (!isChunkLoadFailure(reason)) {
        return;
      }
      if (sessionStorage.getItem(RELOAD_SESSION_KEY)) {
        return;
      }
      sessionStorage.setItem(RELOAD_SESSION_KEY, "1");
      window.location.reload();
    }

    const onError = (event: ErrorEvent) => {
      tryRecover(event.message || String(event.error ?? ""));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      tryRecover(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
