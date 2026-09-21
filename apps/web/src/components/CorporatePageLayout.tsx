import { type ReactNode } from "react";
import { SiteLayout } from "./SiteLayout";

type CorporatePageLayoutProps = {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
};

export function CorporatePageLayout({
  eyebrow,
  title,
  lead,
  children,
}: CorporatePageLayoutProps) {
  return (
    <SiteLayout headerVariant="public">
      <div className="module-page corporate-page">
        <header className="exchange-hero">
          <div>
            <p className="exchange-eyebrow">{eyebrow}</p>
            <h1 className="exchange-title">{title}</h1>
            <p className="exchange-lead">{lead}</p>
          </div>
        </header>
        {children}
      </div>
    </SiteLayout>
  );
}
