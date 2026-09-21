import Link from "next/link";
import { SiteBrand } from "./SiteBrand";
import { CORPORATE_NAV_ITEMS, PLATFORM_NAV_ITEMS } from "../lib/siteNavigation";

const SOCIAL_LINKS = [
  { href: "https://t.me/nakliyeborsasi", label: "Telegram", icon: "TG" },
  { href: "https://www.linkedin.com/", label: "LinkedIn", icon: "in" },
  { href: "https://www.facebook.com/", label: "Facebook", icon: "f" },
  { href: "https://www.instagram.com/", label: "Instagram", icon: "IG" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner site-footer-inner--4">
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
        <div className="site-footer-col">
          <p className="site-footer-heading">Sosyal medya</p>
          <ul className="site-footer-social">
            {SOCIAL_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  <span className="social-icon" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} Nakliye Borsası · Demo ortam</p>
        <p className="site-footer-muted">Koridor: Türkiye — Ukrayna — Avrupa Birliği</p>
      </div>
    </footer>
  );
}
