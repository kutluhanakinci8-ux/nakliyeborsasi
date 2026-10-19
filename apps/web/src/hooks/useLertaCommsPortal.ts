"use client";

import { useMemo } from "react";
import { isLertaCommsPortalHost } from "../lib/lertaCommsPortal";

export function useLertaCommsPortal(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return isLertaCommsPortalHost(window.location.hostname);
  }, []);
}
