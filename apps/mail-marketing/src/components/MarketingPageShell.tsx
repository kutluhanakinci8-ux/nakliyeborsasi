import type { ReactNode } from "react";
import { MarketingPlatformHeader } from "./MarketingPlatformHeader";
import { MarketingSiteFooter } from "./MarketingSiteFooter";

export function MarketingPageShell({
  children,
  narrow,
  contentClassName,
}: {
  children: ReactNode;
  narrow?: boolean;
  contentClassName?: string;
}) {
  const contentClasses = ["platform-content", contentClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="landing">
      <MarketingPlatformHeader />
      <main
        className={`platform-main ${narrow ? "platform-main--narrow" : ""}`}
      >
        <div className={contentClasses}>{children}</div>
      </main>
      <div className="platform-footer-wrap">
        <MarketingSiteFooter />
      </div>
    </div>
  );
}
