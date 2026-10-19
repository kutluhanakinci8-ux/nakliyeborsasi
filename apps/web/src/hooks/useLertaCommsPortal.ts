"use client";

import { useMemo } from "react";
import { isLertaCommsPortalHost } from "../lib/lertaCommsPortal";

export function useLertaCommsPortal(): boolean {
  return useMemo(
    () => isLertaCommsPortalHost(window.location.hostname),
    [],
  );
}
