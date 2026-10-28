import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/marketingSite";

export const metadata: Metadata = {
  title: "Güven & uyum — Lerta",
  description:
    "Lerta Posta ve Mesaj: Türkiye barındırma, teslimat güvenliği, kiracı izolasyonu, SLA ve KVKK özeti.",
};

const PILLARS = [
  {
    title: "Veri konumu",
    body: "Kurumsal posta ve mesajlaşma altyapısı Türkiye'de barındırılır. KVKK kapsamında veri işleme ve saklama politikaları kurumsal sözleşmelerle tamamlanır.",
  },
  {
    title: "Posta teslimat güvenliği",
    body: "SPF, DKIM ve DMARC ile imzalı gönderim; Rspamd tabanlı filtreleme; kiracı bazlı kotalar ve teslimat izleme.",
  },
  {
    title: "Mesajlaşma güvenliği",
    body: "Kiracı izolasyonu, denetlenebilir mesaj geçmişi, oturum güvenliği ve kanal köprüleri için kontrollü entegrasyon modeli.",
  },
  {
    title: "Erişim ve yönetim",
    body: "Rol tabanlı yönetim konsolu, iki adımlı doğrulama seçenekleri ve operasyonel günlükler (plan ve sözleşmeye bağlı).",
  },
] as const;

const LINKS = [
  { href: "/sla", label: "Hizmet düzeyi (SLA)" },
  { href: "/kvkk", label: "KVKK aydınlatma özeti" },
  { href: "/durum", label: "Canlı sistem durumu" },
  { href: "/kullanim-sartlari", label: "Kullanım şartları" },
  { href: "/cerez", label: "Çerez politikası" },
] as const;

export default function GuvenPage() {
  return (
    <MarketingPageShell
      narrow
      contentClassName="platform-content--product-vitrin platform-content--trust"
    >
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <span>Güven & uyum</span>
      </nav>

      <div className="section-head section-head--center trust-page__head">
        <h1 className="section-title section-title--lg">Güven & uyum merkezi</h1>
        <p className="section-lead section-lead--wide">
          Lerta Posta ve Lerta Mesaj için barındırma, güvenlik ve şeffaflık
          taahhütlerinin özeti. Kesin yükümlülükler kurumsal sözleşmede yer alır.
        </p>
      </div>

      <div className="trust-pillar-grid">
        {PILLARS.map((p) => (
          <article key={p.title} className="posta-feature-card trust-pillar-card">
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>

      <section className="trust-page__links" aria-labelledby="trust-docs-title">
        <h2 id="trust-docs-title" className="section-title">
          Politikalar ve izleme
        </h2>
        <ul className="trust-doc-list">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="trust-page__contact">
        Güvenlik veya uyum soruları:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      <p className="legal-muted">{LEGAL_DISCLAIMER}</p>
    </MarketingPageShell>
  );
}
