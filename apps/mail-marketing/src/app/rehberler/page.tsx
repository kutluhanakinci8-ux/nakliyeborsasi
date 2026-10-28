import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  GUIDE_CATEGORY_LABELS,
  MARKETING_GUIDES,
  type GuideCategory,
} from "@/lib/marketingGuides";

export const metadata: Metadata = {
  title: "Kurulum rehberleri — Lerta",
  description:
    "DNS, webmail, e-posta istemcisi, mesaj girişi, faturalama ve güvenlik rehberleri.",
};

const CATEGORY_ORDER: GuideCategory[] = ["posta", "mesaj", "fatura", "guven"];

export default function RehberlerIndexPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin platform-content--support-docs">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <span>Rehberler</span>
      </nav>

      <h1 className="section-title section-title--lg">Kurulum rehberleri</h1>
      <p className="pricing-lead pricing-lead--wide">
        Adım adım kurulum ve yönetim. Özet cevaplar için{" "}
        <Link href="/sss">SSS</Link>; acil kesinti için <Link href="/durum">canlı durum</Link>.
        Uzun vadede genişletilmiş bilgi bankası <strong>destek.lerta.com.tr</strong> hedeflenir;
        şimdilik rehberler vitrinde barındırılır.
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const guides = MARKETING_GUIDES.filter((g) => g.category === cat);
        if (guides.length === 0) return null;
        return (
          <section key={cat} className="guide-index__group" aria-labelledby={`guide-cat-${cat}`}>
            <h2 id={`guide-cat-${cat}`} className="destek-section-title">
              {GUIDE_CATEGORY_LABELS[cat]}
            </h2>
            <ul className="guide-index__list">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/rehberler/${g.slug}`} className="guide-index__card">
                    <span className="guide-index__card-title">{g.title}</span>
                    <span className="guide-index__card-summary">{g.summary}</span>
                    <span className="guide-index__card-meta">{g.readMinutes} dk</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </MarketingPageShell>
  );
}
