import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { SssFaqExplorer } from "@/components/SssFaqExplorer";
import { MARKETING_FAQ_ACTIVE } from "@/lib/marketingFaq";
import { CORPORATE_REGISTER, PILOT_REGISTER } from "@/lib/marketingUrls";

export const metadata: Metadata = {
  title: "SSS — Lerta",
  description:
    "Lerta Posta ve Mesaj: domain, DNS, planlar, güvenlik ve destek sık sorulan sorular.",
};

export default function SssPage() {
  return (
    <MarketingPageShell
      narrow
      contentClassName="platform-content--product-vitrin platform-content--support-docs"
    >
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <span>SSS</span>
      </nav>

      <h1 className="section-title section-title--lg">Sık sorulan sorular</h1>
      <p className="pricing-lead">
        Lerta Posta, Lerta Mesaj, faturalama ve güvenlik hakkında özet cevaplar. Adım adım kurulum
        için <Link href="/rehberler">rehberler</Link>. Hukuki detay:{" "}
        <Link href="/guven">Güven & uyum</Link>, <Link href="/sla">SLA</Link>,{" "}
        <Link href="/iletisim">İletişim</Link>.
      </p>

      <SssFaqExplorer items={MARKETING_FAQ_ACTIVE} />

      <p className="pricing-lead">
        <a className="btn btn-primary posta-btn-primary" href={CORPORATE_REGISTER}>
          Kurumsal kayıt
        </a>
        <a
          className="btn btn-ghost posta-btn-secondary"
          href={PILOT_REGISTER}
          style={{ marginLeft: 12 }}
        >
          Pilot kayıt
        </a>
      </p>
    </MarketingPageShell>
  );
}
