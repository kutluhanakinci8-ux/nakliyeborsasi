import { type ReactNode } from "react";
import { PublicPageShell } from "./PublicPageShell";
import { SiteLayout } from "./SiteLayout";

type CorporatePageLayoutProps = {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumb?: string;
  showHeroVisual?: boolean;
  children: ReactNode;
};

export function CorporatePageLayout({
  eyebrow,
  title,
  lead,
  breadcrumb,
  showHeroVisual = true,
  children,
}: CorporatePageLayoutProps) {
  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        breadcrumbLabel={breadcrumb ?? title}
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        showHeroVisual={showHeroVisual}
      >
        <div className="corporate-page-body">{children}</div>
      </PublicPageShell>
    </SiteLayout>
  );
}
