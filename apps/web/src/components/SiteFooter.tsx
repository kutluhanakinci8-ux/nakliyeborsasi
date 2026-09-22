import Link from "next/link";
import { SiteBrand } from "./SiteBrand";
import { SocialMediaLinks } from "./SocialMediaLinks";
import { FooterStoreBadges } from "./FooterTrustBar";
import { CORPORATE_NAV_ITEMS, PLATFORM_NAV_ITEMS } from "../lib/siteNavigation";

const LEGAL_LINKS = [
  { href: "/kisisel-verilerin-korunmasi", label: "Kişisel Verilerin Korunması" },
  { href: "/kullanim-kosullari", label: "Kullanım Koşullarımız" },
  { href: "/cerez-ayarlari", label: "Çerez Ayarları" },
] as const;

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
          <div className="site-footer-brand-social">
            <p className="site-footer-heading">Sosyal medya</p>
            <p className="site-footer-social-lead">
              Bizi takip edin — duyurular ve koridor haberleri
            </p>
            <SocialMediaLinks />
            <FooterStoreBadges />
          </div>
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
        <div className="site-footer-col site-footer-col--corporate">
          <p className="site-footer-heading">Kurumsal</p>
          <ul className="site-footer-links">
            {CORPORATE_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="site-footer-meta">
          <nav className="site-footer-legal" aria-label="Yasal bilgiler">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="site-footer-copy">© {new Date().getFullYear()} Nakliye Borsası</p>
        </div>
      </div>
    </footer>
  );
}
