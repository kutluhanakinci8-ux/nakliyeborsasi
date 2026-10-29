import type { Metadata } from "next";
import Link from "next/link";
import { DestekHubSearch } from "@/components/DestekHubSearch";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  COMPANY_EMAIL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
  LEGAL_DISCLAIMER,
  SALES_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/marketingSite";
import { CONSOLE_LOGIN_SUPPORT_NEXT } from "@/lib/marketingSupportConsole";
import { CONSOLE_URL, MAIL_WEB_URL, MESSAGING_LOGIN_URL } from "@/lib/marketingUrls";

export const metadata: Metadata = {
  title: "Destek merkezi — Lerta",
  description:
    "Lerta Posta ve Mesaj: yardım arama, SSS, rehberler, SLA, canlı durum ve iletişim kanalları.",
};

const QUICK_PATHS = [
  {
    title: "Posta sorunu",
    body: "DNS, webmail, teslimat ve hesap erişimi.",
    href: "/sss",
    cta: "Posta SSS",
  },
  {
    title: "Mesaj sorunu",
    body: "Giriş, sohbet, bildirimler ve köprü paketleri.",
    href: "/sss",
    cta: "Mesaj SSS",
  },
  {
    title: "Plan ve fatura",
    body: "Kayıt, yükseltme, iptal ve ödeme.",
    href: "/iletisim",
    cta: "Fatura / satış",
  },
] as const;

const SELF_SERVICE = [
  {
    title: "Yazılım indir",
    body: "WinLRT — .ltr belgeleri için Windows, Mac, Android ve iOS istemcileri.",
    href: "/destek/yazilim-indir",
    cta: "İndirmeler",
  },
  {
    title: "Sık sorulan sorular",
    body: "Domain, DNS, planlar, faturalama ve güvenlik — kategorili SSS.",
    href: "/sss",
    cta: "SSS'ye git",
  },
  {
    title: "Kurulum rehberleri",
    body: "DNS, webmail, istemci, mesaj girişi ve faturalama adımları.",
    href: "/rehberler",
    cta: "Rehberlere git",
  },
  {
    title: "İletişim formu",
    body: "Satış, teknik destek ve kurumsal talepler.",
    href: "/iletisim",
    cta: "Formu aç",
  },
  {
    title: "Hizmet düzeyi (SLA)",
    body: "Kullanılabilirlik, teslimat ve yanıt süreleri.",
    href: "/sla",
    cta: "SLA özeti",
  },
  {
    title: "Canlı durum",
    body: "Posta ve platform bileşenlerinin sağlık durumu.",
    href: "/durum",
    cta: "Durum sayfası",
  },
  {
    title: "Güven & uyum",
    body: "Barındırma, KVKK özeti ve güvenlik politikaları.",
    href: "/guven",
    cta: "Güven merkezi",
  },
] as const;

const SUPPORT_CHANNELS = [
  {
    channel: "Self-servis",
    scope: "SSS, rehberler, SLA, durum, güven",
    hours: "7/24",
    response: "Anında",
  },
  {
    channel: "E-posta (destek)",
    scope: "Teknik destek, kesinti bildirimi",
    hours: "İş günleri 09:00–18:00 (TR)",
    response: "Hedef: 1 iş günü",
  },
  {
    channel: "E-posta (satış)",
    scope: "Kurumsal teklif, Enterprise, köprü paketleri",
    hours: "İş günleri 09:00–18:00 (TR)",
    response: "Hedef: 1 iş günü",
  },
  {
    channel: "Telefon",
    scope: "Satış ve teknik (şimdilik aynı hat)",
    hours: "İş günleri 09:00–18:00 (TR)",
    response: "Anlık görüşme",
  },
  {
    channel: "Destek talebi (panel)",
    scope: "Ticket — yönetim konsolu /destek/talepler (yayında)",
    hours: "Oturum açmanız gerekir",
    response: "Şimdilik e-posta; konsol linki rol kartında",
  },
  {
    channel: "Canlı sohbet",
    scope: "—",
    hours: "Sunulmuyor",
    response: "Global model: e-posta + self-servis",
  },
] as const;

export default function DestekPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin platform-content--destek-hub">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <span>Destek</span>
      </nav>

      <header className="destek-hero">
        <p className="premium-eyebrow premium-eyebrow--posta destek-hero__eyebrow">
          Destek merkezi
        </p>
        <h1 className="posta-hero__title destek-hero__title">Size nasıl yardımcı olabiliriz?</h1>
        <p className="posta-hero__lead destek-hero__lead">
          Kurumsal müşteriler için <strong>self-servis önce</strong>, ardından e-posta ve telefon.
          Acil kesintilerde önce{" "}
          <Link href="/durum">canlı durum</Link>; hedef kullanılabilirlik{" "}
          <Link href="/sla">%99,9</Link> (SLA özeti).
        </p>
        <DestekHubSearch />
      </header>

      <section className="destek-quick-paths" aria-labelledby="destek-quick-title">
        <h2 id="destek-quick-title" className="destek-section-title">
          Hızlı yollar
        </h2>
        <div className="destek-quick-paths__grid">
          {QUICK_PATHS.map((item) => (
            <article key={item.title} className="destek-quick-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link className="btn btn-primary posta-btn-primary" href={item.href}>
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="destek-roles" aria-labelledby="destek-roles-title">
        <h2 id="destek-roles-title" className="destek-section-title">
          Rolünüze göre başlayın
        </h2>
        <div className="destek-roles__grid">
          <article className="destek-role-card">
            <h3>Organizasyon yöneticisi</h3>
            <p>
              Domain doğrulama, kullanıcılar, faturalama ve güvenlik ayarları yönetim konsolundan
              yapılır.
            </p>
            <ul className="destek-role-links">
              <li>
                <a href={CONSOLE_URL} rel="noopener noreferrer">
                  Yönetim konsolu
                </a>
              </li>
              <li>
                <Link href="/guven">Güven & uyum</Link>
              </li>
              <li>
                <Link href="/sla">SLA ve destek seviyeleri</Link>
              </li>
            </ul>
            <p className="destek-role-note">
              Panel destek talepleri:{" "}
              <a href={CONSOLE_LOGIN_SUPPORT_NEXT} rel="noopener noreferrer">
                yönetim konsolu (ticket)
              </a>{" "}
              — <strong>yayına alınırken</strong> aktif olacak. Şimdilik{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </article>
          <article className="destek-role-card">
            <h3>Posta / mesaj kullanıcısı</h3>
            <p>
              Günlük e-posta ve ekip sohbeti için doğrudan uygulama girişlerini kullanın; DNS
              değişikliği için yöneticinize başvurun.
            </p>
            <ul className="destek-role-links">
              <li>
                <a href={MAIL_WEB_URL} rel="noopener noreferrer">
                  Webmail (Posta)
                </a>
              </li>
              <li>
                <a href={MESSAGING_LOGIN_URL} rel="noopener noreferrer">
                  Mesaj girişi
                </a>
              </li>
              <li>
                <Link href="/sss">Kullanıcı SSS</Link>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="destek-outage" aria-labelledby="destek-outage-title">
        <h2 id="destek-outage-title" className="destek-section-title">
          Kesinti veya acil durum
        </h2>
        <ol className="destek-outage__steps">
          <li>
            <Link href="/durum">Canlı durum</Link> sayfasını kontrol edin (planlı bakım duyuruları
            dahil).
          </li>
          <li>
            Sorun devam ediyorsa{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> adresine domain adınız ve hata
            saati ile yazın.
          </li>
          <li>
            SLA ve hedef yanıt süreleri için <Link href="/sla">SLA özeti</Link>.
          </li>
        </ol>
      </section>

      <section aria-labelledby="destek-self-title">
        <h2 id="destek-self-title" className="destek-section-title">
          Self-servis kaynaklar
        </h2>
        <div className="posta-feature-grid destek-channel-grid">
          {SELF_SERVICE.map((ch) => (
            <article key={ch.href + ch.title} className="posta-feature-card destek-channel-card">
              <h3>{ch.title}</h3>
              <p>{ch.body}</p>
              <Link
                className="btn btn-ghost posta-btn-secondary destek-channel-card__cta"
                href={ch.href}
              >
                {ch.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="destek-channels-table-wrap" aria-labelledby="destek-channels-title">
        <h2 id="destek-channels-title" className="destek-section-title">
          Destek kanalları
        </h2>
        <div className="destek-table-scroll">
          <table className="destek-channels-table">
            <thead>
              <tr>
                <th scope="col">Kanal</th>
                <th scope="col">Kapsam</th>
                <th scope="col">Saatler</th>
                <th scope="col">Yanıt</th>
              </tr>
            </thead>
            <tbody>
              {SUPPORT_CHANNELS.map((row) => (
                <tr key={row.channel}>
                  <th scope="row">{row.channel}</th>
                  <td>{row.scope}</td>
                  <td>{row.hours}</td>
                  <td>{row.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="destek-sla-teaser" aria-labelledby="destek-sla-teaser-title">
        <h2 id="destek-sla-teaser-title" className="destek-section-title">
          Plan ve destek seviyesi
        </h2>
        <p className="destek-sla-teaser__lead">
          Pilot, Kurumsal ve Enterprise planlarında destek önceliği farklılaşır. Ayrıntılı tablo{" "}
          <Link href="/sla">SLA sayfasında</Link>; Enterprise için{" "}
          <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>.
        </p>
        <Link className="btn btn-ghost posta-btn-secondary" href="/sla">
          SLA özeti
        </Link>
      </section>

      <section className="destek-contact-strip" aria-labelledby="destek-direct-title">
        <h2 id="destek-direct-title" className="section-title">
          Doğrudan iletişim
        </h2>
        <ul className="destek-contact-list destek-contact-list--cols">
          <li>
            <span className="destek-contact-label">Teknik destek</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </li>
          <li>
            <span className="destek-contact-label">Satış</span>
            <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
          </li>
          <li>
            <span className="destek-contact-label">Genel</span>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
          </li>
          <li>
            <span className="destek-contact-label">Telefon (satış & teknik)</span>
            <a href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE_DISPLAY}</a>
          </li>
        </ul>
        <p className="legal-muted destek-contact-strip__legal">{LEGAL_DISCLAIMER}</p>
      </section>
    </MarketingPageShell>
  );
}
