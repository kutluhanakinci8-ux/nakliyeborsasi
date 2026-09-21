import Link from "next/link";
import { SiteBrand } from "./SiteBrand";
import { SocialMediaLinks } from "./SocialMediaLinks";
import { CORPORATE_NAV_ITEMS, PLATFORM_NAV_ITEMS } from "../lib/siteNavigation";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top-accent" aria-hidden />
      <div className="site-footer-inner site-footer-inner--3">
        <div className="site-footer-brand">
          <SiteBrand
            href="/hizmetler"
            size="sm"
            variant="footer"
            tagline="TR · UA · EU yük ve taşıma borsası"
          />
        </div>
        <div className="site-footer-col">
          <p className="site-footer-heading">Platform</p>
          <ul className="site-footer-links">
            {PLATFORM_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="site-footer-col">
          <p className="site-footer-heading">Kurumsal</p>
          <ul className="site-footer-links">
            {CORPORATE_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="site-footer-social-band">
        <div className="site-footer-social-band-inner">
          <div className="site-footer-social-intro">
            <p className="site-footer-heading">Sosyal medya</p>
            <p className="site-footer-social-lead">
              Bizi takip edin — duyurular ve koridor haberleri
            </p>
          </div>
          <SocialMediaLinks />
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} Nakliye Borsası · Demo ortam</p>
        <p className="site-footer-muted">Koridor: Türkiye — Ukrayna — Avrupa Birliği</p>
      </div>
    </footer>
  );
}
