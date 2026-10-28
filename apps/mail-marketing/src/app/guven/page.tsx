import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SALES_EMAIL, SUPPORT_EMAIL } from "@/lib/marketingSite";
import {
  CONSOLE_LOGIN_SUPPORT_NEXT,
  CONSOLE_SUPPORT_TICKETS_URL,
} from "@/lib/marketingSupportConsole";

export const metadata: Metadata = {
  title: "Güven & uyum — Lerta",
  description:
    "Lerta Posta ve Mesaj: Türkiye barındırma, teslimat güvenliği, kiracı izolasyonu, SLA, KVKK ve güvenlik olayları.",
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

const PRODUCT_CONTROLS = [
  {
    product: "Lerta Posta",
    items: [
      "Kiracı bazlı posta kutusu ve domain doğrulama",
      "TLS ile aktarım; isteğe bağlı TOTP (webmail / konsol)",
      "Giden posta DKIM imzası; SPF/DMARC DNS rehberi",
      "Karantina ve spam skorlama (Rspamd)",
    ],
    guideHref: "/rehberler/dns-mx-spf-dkim-dmarc",
    guideLabel: "DNS ve teslimat rehberi",
  },
  {
    product: "Lerta Mesaj",
    items: [
      "Organizasyon sınırları içinde sohbet ve dosya paylaşımı",
      "Oturum tabanlı erişim; lojistik arayüzü ayrı ürün (lerta.tr)",
      "Köprü paketleri (WhatsApp/Slack) — sözleşmeli entegrasyon",
      "Enterprise API/webhook — ayrı güvenlik incelemesi",
    ],
    guideHref: "/rehberler/mesaj-giris-sohbet",
    guideLabel: "Mesaj girişi rehberi",
  },
] as const;

const LINK_SECTIONS = [
  {
    title: "Yasal ve gizlilik",
    links: [
      { href: "/kvkk", label: "KVKK aydınlatma özeti" },
      { href: "/gizlilik-tercihleri", label: "Gizlilik tercihleri" },
      { href: "/kullanim-sartlari", label: "Kullanım şartları" },
      { href: "/cerez", label: "Çerez politikası" },
    ],
  },
  {
    title: "İzleme ve şeffaflık",
    links: [
      { href: "/durum", label: "Canlı sistem durumu" },
      { href: "/sla", label: "Hizmet düzeyi (SLA)" },
      { href: "/destek", label: "Destek merkezi" },
    ],
  },
  {
    title: "Self-servis",
    links: [
      { href: "/sss", label: "Sık sorulan sorular" },
      { href: "/rehberler", label: "Kurulum rehberleri" },
      { href: "/iletisim", label: "İletişim formu" },
    ],
  },
] as const;

const ROADMAP = [
  {
    label: "SOC 2 / ISO 27001",
    status: "Yol haritası",
    detail: "Kurumsal müşteri talebiyle hizalandırılmış sertifikasyon programı değerlendirilir.",
  },
  {
    label: "Penetrasyon testi özeti",
    status: "Talep üzerine",
    detail: "NDA kapsamında Enterprise müşterilere özet paylaşım.",
  },
  {
    label: "Alt işleyen (subprocessor) listesi",
    status: "Sözleşme eki",
    detail: "Ödeme (Stripe/iyzico) ve barındırma sağlayıcıları kurumsal sözleşmede listelenir.",
  },
] as const;

export default function GuvenPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin platform-content--trust">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <span>Güven & uyum</span>
      </nav>

      <div className="section-head section-head--center trust-page__head">
        <h1 className="section-title section-title--lg">Güven & uyum merkezi</h1>
        <p className="section-lead section-lead--wide">
          Lerta Posta ve Lerta Mesaj için barındırma, güvenlik ve şeffaflık taahhütlerinin özeti.
          Kesin yükümlülükler kurumsal sözleşmede yer alır.
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

      <section className="trust-product-controls" aria-labelledby="trust-products-title">
        <h2 id="trust-products-title" className="destek-section-title">
          Ürün kontrolleri
        </h2>
        <div className="trust-product-controls__grid">
          {PRODUCT_CONTROLS.map((block) => (
            <article key={block.product} className="trust-product-block">
              <h3>{block.product}</h3>
              <ul>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="trust-product-block__guide">
                <Link href={block.guideHref}>{block.guideLabel}</Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="trust-incident" aria-labelledby="trust-incident-title">
        <h2 id="trust-incident-title" className="destek-section-title">
          Güvenlik olayı ve destek
        </h2>
        <p className="trust-incident__lead">
          Şüpheli erişim, veri sızıntısı veya teslimat anomalisi: önce{" "}
          <Link href="/durum">canlı durum</Link> ile genel kesinti dışında mı kontrol edin.
        </p>
        <ul className="trust-incident__list">
          <li>
            <strong>E-posta:</strong>{" "}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Güvenlik bildirimi")}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            — konu satırında &quot;Güvenlik bildirimi&quot; kullanın.
          </li>
          <li>
            <strong>Destek talebi (panel):</strong> modül yayına alınırken{" "}
            <a href={CONSOLE_LOGIN_SUPPORT_NEXT} rel="noopener noreferrer">
              yönetim konsolu → destek talepleri
            </a>{" "}
            (<code>{CONSOLE_SUPPORT_TICKETS_URL.replace(/^https?:\/\//, "")}</code>). Şimdilik ticket
            yerine e-posta veya <Link href="/iletisim?konu=teknik">iletişim formu</Link>.
          </li>
          <li>
            <strong>Enterprise / uyum:</strong>{" "}
            <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
          </li>
        </ul>
      </section>

      <section className="trust-data-rights" aria-labelledby="trust-data-title">
        <h2 id="trust-data-title" className="destek-section-title">
          Veri sahibi hakları (KVKK)
        </h2>
        <p>
          Yönetim konsolunda gizlilik bölümünden veri dışa aktarma ve hesap silme self-servis
          (ürün bayraklarına bağlı). Özet metin: <Link href="/kvkk">/kvkk</Link>.
        </p>
      </section>

      {LINK_SECTIONS.map((section, idx) => (
        <section
          key={section.title}
          className="trust-page__links"
          aria-labelledby={`trust-links-${idx}`}
        >
          <h2 id={`trust-links-${idx}`} className="section-title">
            {section.title}
          </h2>
          <ul className="trust-doc-list">
            {section.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="trust-roadmap" aria-labelledby="trust-roadmap-title">
        <h2 id="trust-roadmap-title" className="destek-section-title">
          Sertifikasyon ve kurumsal paketler
        </h2>
        <ul className="trust-roadmap__list">
          {ROADMAP.map((row) => (
            <li key={row.label} className="trust-roadmap__item">
              <span className="trust-roadmap__label">{row.label}</span>
              <span className="trust-roadmap__status">{row.status}</span>
              <p>{row.detail}</p>
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
