import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  CONSOLE_URL,
  MAIL_WEB_URL,
} from "@/lib/marketingUrls";
import { PricingSection } from "../PricingSection";

export default function PostaProductPage() {
  const loginHref = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${CONSOLE_URL.replace(/\/$/, "")}/login`;

  return (
    <MarketingPageShell>
      <p className="breadcrumb">
        <a href="/">Lerta</a> / Posta
      </p>
      <section className="hero">
        <p className="hero-eyebrow">Kurumsal e-posta SaaS</p>
        <h1>Posta kutunuz, firmanızın alan adında</h1>
        <p className="lead">
          Özel domain, DNS sihirbazı ve webmail tek panelde. Bireysel deneme için
          pilot alt alan; kurumsal müşteriler için{" "}
          <strong>info@sizin-domain.com</strong> modeli.
        </p>
        <p className="hero-hint">
          <strong>Domain ile başla</strong> ve <strong>Webmail giriş</strong> üst
          menüde. Yönetim:{" "}
          <a href={consoleLoginHref}>yonetim.lerta.com.tr</a>
        </p>
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
