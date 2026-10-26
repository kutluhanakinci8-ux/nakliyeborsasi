import Link from "next/link";
import { PLATFORM_REGISTER_HREF } from "@/lib/platformProducts";
import { MAIL_WEB_URL } from "@/lib/marketingUrls";
import { MarketingIcon } from "./MarketingIcons";

const webmail = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;

export function HomePremiumHero() {
  return (
    <section className="premium-hero" aria-labelledby="home-hero-title">
      <div className="premium-hero__glow" aria-hidden="true" />
      <div className="premium-hero__inner">
        <p className="premium-eyebrow">
          <span className="premium-eyebrow__dot" aria-hidden="true" />
          Kurumsal iletişim platformu · Türkiye
        </p>
        <h1 id="home-hero-title" className="premium-hero__title">
          Posta, mesajlaşma ve uyumluluk —{" "}
          <span className="premium-gradient-text">tek marka</span> altında
        </h1>
        <p className="premium-hero__lead">
          <strong>Lerta Posta</strong> ile domain tabanlı kurumsal e-posta;{" "}
          <strong>Lerta Mesaj</strong> ile firma sohbeti;{" "}
          <strong>KVKK (U88)</strong> ile çerez ve VERBİS control plane.
        </p>
        <div className="premium-hero__cta">
          <Link className="btn btn-primary btn-lg" href="/posta">
            Posta ürününü keşfet
          </Link>
          <a className="btn btn-ghost btn-lg" href={webmail}>
            Webmail giriş
          </a>
          <a className="btn btn-ghost btn-lg" href={PLATFORM_REGISTER_HREF}>
            Domain ile başla
          </a>
        </div>
        <ul className="premium-hero__pills" aria-label="Öne çıkan özellikler">
          <li>
            <MarketingIcon name="check" className="premium-icon premium-icon--sm" />
            MX · SPF · DKIM
          </li>
          <li>
            <MarketingIcon name="check" className="premium-icon premium-icon--sm" />
            Kiracı izolasyonu
          </li>
          <li>
            <MarketingIcon name="check" className="premium-icon premium-icon--sm" />
            KVKK uyum paketi
          </li>
        </ul>
      </div>
      <div className="premium-hero__visual" aria-hidden="true">
        <div className="premium-mock premium-mock--posta">
          <div className="premium-mock__chrome">
            <span />
            <span />
            <span />
          </div>
          <div className="premium-mock__body">
            <div className="premium-mock__sidebar" />
            <div className="premium-mock__main">
              <div className="premium-mock__line premium-mock__line--wide" />
              <div className="premium-mock__line" />
              <div className="premium-mock__line" />
              <div className="premium-mock__card" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
