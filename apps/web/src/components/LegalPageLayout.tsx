import Link from "next/link";
import { type ReactNode } from "react";
import { PublicPageShell } from "./PublicPageShell";
import { SiteLayout } from "./SiteLayout";

export type LegalTocItem = {
  id: string;
  label: string;
};

type LegalPageLayoutProps = {
  title: string;
  lead: string;
  breadcrumbLabel?: string;
  eyebrow?: string;
  toc: readonly LegalTocItem[];
  children: ReactNode;
};

const LEGAL_RELATED = [
  { href: "/kisisel-verilerin-korunmasi", label: "KVKK / Aydınlatma" },
  { href: "/cerez-ayarlari", label: "Çerez ayarları" },
  { href: "/iletisim", label: "İletişim" },
] as const;

export function LegalPageLayout({
  title,
  lead,
  breadcrumbLabel,
  eyebrow,
  toc,
  children,
}: LegalPageLayoutProps) {
  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        breadcrumbLabel={breadcrumbLabel ?? title}
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        showHeroVisual={false}
        heroCompact
      >
        <div className="legal-page-grid">
          <aside className="module-panel module-panel--elevated legal-toc-panel" aria-label="İçindekiler">
            <h2 className="legal-toc-title">İçindekiler</h2>
            <ol className="legal-toc-list">
              {toc.map((item, index) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>
                    <span className="legal-toc-num">{index + 1}.</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
            <p className="legal-toc-note">
              Bu metin bilgilendirme amaçlıdır. Canlı ortamda yayımlanan sözleşme geçerlidir.
            </p>
          </aside>
          <article className="module-panel module-panel--elevated legal-prose corporate-prose">
            {children}
          </article>
        </div>
        <section className="module-panel legal-related-panel" aria-label="İlgili sayfalar">
          <h2 className="module-panel-title">İlgili sayfalar</h2>
          <ul className="legal-related-links">
            {LEGAL_RELATED.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
