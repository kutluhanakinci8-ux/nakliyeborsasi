import type { ReactNode } from "react";
import { MarketingSiteFooter } from "./MarketingSiteFooter";
import { MarketingSiteHeader } from "./MarketingSiteHeader";

export function MarketingPageShell({
  children,
  narrow,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="landing">
      <div className={`wrap ${narrow ? "wrap-narrow" : ""}`}>
        <MarketingSiteHeader />
        {children}
        <MarketingSiteFooter />
      </div>
    </div>
  );
}
