"use client";

import { type ReactNode } from "react";
import { SiteLayout } from "./SiteLayout";

export function DashboardShell({ children }: { children: ReactNode }) {
  return <SiteLayout headerVariant="app">{children}</SiteLayout>;
}
