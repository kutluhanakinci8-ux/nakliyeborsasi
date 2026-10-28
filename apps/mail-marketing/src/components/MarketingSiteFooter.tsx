import Link from "next/link";
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
} from "@/lib/marketingSite";
import {
  CONSOLE_URL,
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  MESSAGING_APP_URL,
  PILOT_REGISTER,
} from "@/lib/marketingUrls";
import { MarketingAppStoreBadges } from "./MarketingAppStoreBadges";
import { LertaBrandLogoVideo } from "./LertaBrandLogoVideo";
import { MarketingSocialLinks } from "./MarketingSocialLinks";

const TRUST_ITEMS = [
  { value: "TR", label: "Veri Türkiye'de" },
  { value: "99,9%", label: "Hedef SLA" },
  { value: "DKIM", label: "İmzalı gönderim" },
  { value: "PWA", label: "Mobil webmail" },
] as const;

export function MarketingSiteFooter() {
  const year = new Date().getFullYear();
  const webmail = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;

  return (
    <footer className="site-footer site-footer--platform site-footer--premium">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Link href="/" className="site-footer__logo" aria-label="Lerta ana sayfa">
            <LertaBrandLogoVideo variant="footer" />
          </Link>
          <p className="site-footer__tagline">
            Kurumsal posta ve firma mesajlaşması — Türkiye&apos;de barındırılan altyapı.
          </p>
          <MarketingSocialLinks />
          <MarketingAppStoreBadges />
          <ul className="site-footer__trust" aria-label="Güven göstergeleri">
            {TRUST_ITEMS.map((item) => (
              <li key={item.label} className="site-footer__trust-item">
                <span className="site-footer__trust-value">{item.value}</span>
                <span className="site-footer__trust-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <h3 className="site-footer__col-title">Ürünler</h3>
          <ul className="site-footer__col-list">
            <li>
              <Link href="/posta">Lerta Posta</Link>
            </li>
            <li>
              <Link href="/mesaj">Lerta Mesaj</Link>
            </li>
            <li>
              <a href={webmail}>Webmail giriş</a>
            </li>
            <li>
              <a href={CORPORATE_REGISTER}>Kurumsal kayıt</a>
            </li>
            <li>
              <a href={PILOT_REGISTER}>Pilot kayıt</a>
            </li>
            <li>
              <a href={MESSAGING_APP_URL}>Mesajlaşmaya git</a>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h3 className="site-footer__col-title">Destek</h3>
          <ul className="site-footer__col-list">
            <li>
              <Link href="/sss">Sık sorulan sorular</Link>
            </li>
            <li>
              <Link href="/sla">Hizmet düzeyi (SLA)</Link>
            </li>
            <li>
              <Link href="/durum">Canlı durum</Link>
            </li>
            <li>
              <Link href="/iletisim">İletişim formu</Link>
            </li>
            <li>
              <a href={CONSOLE_URL}>Yönetim konsolu</a>
            </li>
            <li>
              <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
            </li>
          </ul>
        </div>

        <div className="site-footer__col site-footer__col--contact">
          <h3 className="site-footer__col-title">İletişim</h3>
          <ul className="site-footer__contact-list">
            <li>
              <span className="site-footer__contact-label">Telefon</span>
              <a href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE_DISPLAY}</a>
            </li>
            <li>
              <span className="site-footer__contact-label">Adres</span>
              <span>{COMPANY_ADDRESS}</span>
            </li>
            <li>
              <span className="site-footer__contact-label">E-posta</span>
              <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p className="site-footer__copy">
          <span className="site-footer__copy-mark">© {year}</span>{" "}
          <span className="site-footer__copy-brand">Lerta</span> · Posta ve Mesajlaşma
          — Türkiye&apos;de barındırılan kurumsal platform
        </p>
      </div>
    </footer>
  );
}
