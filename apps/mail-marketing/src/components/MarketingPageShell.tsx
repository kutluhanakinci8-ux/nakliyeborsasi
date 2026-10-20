import type { ReactNode } from "react";
import { MarketingPlatformHeader } from "./MarketingPlatformHeader";
import { MarketingSiteFooter } from "./MarketingSiteFooter";

export function MarketingPageShell({
  children,
  narrow,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="landing">
      <MarketingPlatformHeader />
      <main
        className={`platform-main ${narrow ? "platform-main--narrow" : ""}`}
      >
        <div className="platform-content">{children}</div>
      </main>
      <div className="platform-footer-wrap">
        <MarketingSiteFooter />
      </div>
    </div>
  );
}
