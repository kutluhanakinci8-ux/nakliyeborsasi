import Link from "next/link";
import { type ReactNode } from "react";
import { SiteLayout } from "./SiteLayout";

type CorporatePageLayoutProps = {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumb?: string;
  children: ReactNode;
};

export function CorporatePageLayout({
  eyebrow,
  title,
  lead,
  breadcrumb,
  children,
}: CorporatePageLayoutProps) {
  return (
    <SiteLayout headerVariant="public">
      <div className="module-page corporate-page">
        <div className="contact-page-hero corporate-page-hero">
          <nav className="page-breadcrumb" aria-label="Konum">
            <Link href="/hakkimizda">Kurumsal</Link>
            <span aria-hidden>›</span>
            <span className="page-breadcrumb-current">{breadcrumb ?? title}</span>
          </nav>
          <div className="contact-page-hero-grid corporate-page-hero-grid">
            <div>
              <p className="exchange-eyebrow">{eyebrow}</p>
              <h1 className="exchange-title">{title}</h1>
              <p className="exchange-lead contact-page-lead">{lead}</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </SiteLayout>
  );
}
