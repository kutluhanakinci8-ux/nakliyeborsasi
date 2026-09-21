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
    <div className="site-layout">
      <SiteHeader variant={headerVariant} />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
