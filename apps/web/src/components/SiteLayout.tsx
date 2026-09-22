"use client";

import { type ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type SiteLayoutProps = {
  children: ReactNode;
  headerVariant?: "public" | "app";
};

export function SiteLayout({ children, headerVariant = "app" }: SiteLayoutProps) {
  return (
    <div className="site-layout site-layout--corporate">
      <SiteHeader variant={headerVariant} />
      <main className="site-main">
        <div className="site-canvas">{children}</div>
      </main>
      <div className="site-footer-bridge" aria-hidden />
      <SiteFooter />
    </div>
  );
}
