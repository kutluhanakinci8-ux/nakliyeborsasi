import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  COMPANY_EMAIL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
  SUPPORT_EMAIL,
} from "@/lib/marketingSite";

export const metadata: Metadata = {
  title: "Destek — Lerta",
  description:
    "Lerta Posta ve Mesaj: sık sorulan sorular, iletişim, SLA ve canlı durum.",
};

const CHANNELS = [
  {
    title: "Sık sorulan sorular",
    body: "Domain, DNS, planlar, faturalama ve güvenlik hakkında hızlı cevaplar.",
    href: "/sss",
    cta: "SSS'ye git",
  },
  {
    title: "İletişim formu",
    body: "Satış, teknik destek ve kurumsal talepler için bize yazın.",
    href: "/iletisim",
    cta: "İletişim",
  },
  {
    title: "Hizmet düzeyi (SLA)",
    body: "Kullanılabilirlik hedefleri, teslimat ve destek yanıt süreleri.",
    href: "/sla",
    cta: "SLA özeti",
  },
  {
    title: "Canlı durum",
    body: "Posta ve platform bileşenlerinin güncel sağlık durumu.",
    href: "/durum",
    cta: "Durum sayfası",
  },
  {
    title: "Güven & uyum",
    body: "Barındırma, KVKK özeti ve güvenlik politikalarına genel bakış.",
    href: "/guven",
    cta: "Güven merkezi",
  },
] as const;

export default function DestekPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <span>Destek</span>
      </nav>

      <div className="section-head section-head--center">
        <h1 className="section-title section-title--lg">Destek</h1>
        <p className="section-lead section-lead--wide">
          Kurumsal müşteriler için self-servis kaynaklar ve doğrudan iletişim
          kanalları. İş günlerinde e-posta desteği; acil kesintilerde durum
          sayfasını takip edin.
        </p>
      </div>

      <div className="posta-feature-grid destek-channel-grid">
        {CHANNELS.map((ch) => (
          <article key={ch.href} className="posta-feature-card destek-channel-card">
            <h3>{ch.title}</h3>
            <p>{ch.body}</p>
            <Link className="btn btn-ghost posta-btn-secondary destek-channel-card__cta" href={ch.href}>
              {ch.cta}
            </Link>
          </article>
        ))}
      </div>

      <section className="destek-contact-strip" aria-labelledby="destek-direct-title">
        <h2 id="destek-direct-title" className="section-title">
          Doğrudan iletişim
        </h2>
        <ul className="destek-contact-list">
          <li>
            <span className="destek-contact-label">Destek e-posta</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </li>
          <li>
            <span className="destek-contact-label">Genel</span>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </li>
          <li>
            <span className="destek-contact-label">Telefon</span>
            <a href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE_DISPLAY}</a>
          </li>
        </ul>
      </section>
    </MarketingPageShell>
  );
}
