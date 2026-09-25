import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  CONSOLE_URL,
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
} from "@/lib/marketingUrls";
import { PricingSection } from "./PricingSection";

export default function MarketingHomePage() {
  const loginHref = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${CONSOLE_URL.replace(/\/$/, "")}/login`;

  return (
    <MarketingPageShell>
      <section className="hero">
        <p className="hero-eyebrow">Kurumsal e-posta SaaS</p>
        <h1>Posta kutunuz, firmanızın alan adında</h1>
        <p className="lead">
          Özel domain, DNS sihirbazı ve webmail tek panelde. Bireysel deneme için
          pilot alt alan; kurumsal müşteriler için{" "}
          <strong>info@sizin-domain.com</strong> modeli.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href={CORPORATE_REGISTER}>
            Domain ile başla
          </a>
          <a className="btn btn-ghost" href={consoleLoginHref}>
            Yönetim konsolu
          </a>
          <a className="btn btn-ghost" href={loginHref}>
            Webmail giriş
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Özel domain öncelikli</h3>
          <p>
            Kayıt sonrası ilk adım: alan adınızı ekleyin, MX/SPF/DKIM/DMARC
            kayıtlarını panelden takip edin.
          </p>
        </article>
        <article className="card">
          <h3>Webmail</h3>
          <p>
            Gelen kutusu, taslaklar, arama ve ekler —{" "}
            <a href={loginHref}>posta.lerta.com.tr</a>.
          </p>
        </article>
        <article className="card">
          <h3>Güvenilir gönderim</h3>
          <p>
            Postfix, OpenDKIM ve Rspamd; kiracı bazlı izolasyon ve gönderim
            kotası.
          </p>
        </article>
      </section>

      <PricingSection />
    </MarketingPageShell>
  );
}
