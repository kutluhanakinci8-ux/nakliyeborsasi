import Link from "next/link";
import {
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  PILOT_REGISTER,
} from "@/lib/marketingUrls";
import { LertaBrandLogoVideo } from "./LertaBrandLogoVideo";
import { MarketingSocialLinks } from "./MarketingSocialLinks";

export function MarketingSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer--platform site-footer--premium">
      <div className="site-footer__brand">
        <Link href="/" className="site-footer__logo" aria-label="Lerta ana sayfa">
          <LertaBrandLogoVideo variant="footer" />
        </Link>
        <MarketingSocialLinks />
      </div>

      <p className="site-footer__copy">
        <span className="site-footer__copy-mark">© {year}</span>{" "}
        <span className="site-footer__copy-brand">Lerta</span> · Posta ve Mesajlaşma
        — Türkiye&apos;de barındırılan kurumsal platform
      </p>

      <nav className="footer-links site-footer__links" aria-label="Alt bilgi">
        <a href="/posta">Posta</a>
        <a href={`${MAIL_WEB_URL.replace(/\/$/, "")}/login`}>Webmail giriş</a>
        <a href="/mesaj">Mesajlaşma</a>
        <a href="/sss">SSS</a>
        <a href="/sla">SLA</a>
        <a href="/durum">Durum</a>
        <a href="/iletisim">İletişim</a>
        <a href={CORPORATE_REGISTER}>Kurumsal kayıt</a>
        <a href={PILOT_REGISTER}>Pilot kayıt</a>
      </nav>
    </footer>
  );
}
