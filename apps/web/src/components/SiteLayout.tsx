"use client";

import { type ReactNode } from "react";
import { PlatformAdminLiveSiteBanner } from "./platform-admin/PlatformAdminLiveSiteBanner";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type SiteLayoutProps = {
  children: ReactNode;
  headerVariant?: "public" | "app";
  commsPortal?: boolean;
};

export function SiteLayout({
  children,
  headerVariant = "app",
  commsPortal,
}: SiteLayoutProps) {
  const layoutClass = commsPortal
    ? "site-layout site-layout--corporate site-layout--u88-platform"
    : "site-layout site-layout--corporate";

  return (
    <div className={layoutClass}>
      <PlatformAdminLiveSiteBanner />
      <SiteHeader variant={headerVariant} commsPortal={commsPortal} />
      <main className="site-main">
        <div className="site-canvas">{children}</div>
      </main>
      <div className="site-footer-bridge" aria-hidden />
      <SiteFooter />
    </div>
  );
}
