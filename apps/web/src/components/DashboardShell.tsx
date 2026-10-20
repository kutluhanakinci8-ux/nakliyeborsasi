"use client";

import { type ReactNode } from "react";
import { useLertaCommsPortal } from "../hooks/useLertaCommsPortal";
import { SiteLayout } from "./SiteLayout";

export function DashboardShell({ children }: { children: ReactNode }) {
  const isCommsPortal = useLertaCommsPortal();
  return (
    <SiteLayout headerVariant="app" commsPortal={isCommsPortal}>
      {children}
    </SiteLayout>
  );
}
