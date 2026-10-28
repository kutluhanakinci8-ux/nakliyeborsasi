import Link from "next/link";
import { MAIL_WEB_URL } from "@/lib/marketingUrls";
import { MarketingIcon } from "./MarketingIcons";
import { HomeHeroBrandSplash } from "./HomeHeroBrandSplash";

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
          Kurumsal posta ve mesajlaşma —{" "}
          <span className="premium-gradient-text">tek marka</span> altında
        </h1>
        <p className="premium-hero__lead">
          <strong>Lerta Posta</strong> ile domain tabanlı kurumsal e-posta;{" "}
          <strong>Lerta Mesaj</strong> ile firma sohbeti ve kanal köprüleri.
        </p>
        <div className="premium-hero__cta">
          <Link className="btn btn-primary btn-lg" href="/posta">
            Posta ürününü keşfet
          </Link>
          <a className="btn btn-ghost btn-lg" href={webmail}>
            Webmail giriş
          </a>
          <a className="btn btn-ghost btn-lg" href="/mesaj">
            Mesajlaşmayı keşfet
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
            Gerçek zamanlı sohbet
          </li>
        </ul>
      </div>
      <div className="premium-hero__visual">
        <HomeHeroBrandSplash />
      </div>
    </section>
  );
}
