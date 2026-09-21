"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteBrand } from "./SiteBrand";
import { useWebSession } from "../context/WebSessionProvider";
import {
  CORPORATE_NAV_ITEMS,
  PLATFORM_NAV_ITEMS,
} from "../lib/siteNavigation";

type SiteHeaderProps = {
  variant?: "public" | "app";
};

export function SiteHeader({ variant = "app" }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session, locale, setLocale, logout } = useWebSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const showUserSession = Boolean(session);

  return (
    <header className="site-header">
      <div className="site-header-utility">
        <div className="site-header-utility-inner">
          <span className="utility-badge">
            <span className="utility-dot" aria-hidden />
            TR · UA · EU koridoru
          </span>
          <div className="utility-actions">
            <div className="utility-quick-links">
              {CORPORATE_NAV_ITEMS.slice(0, 3).map((item) => (
                <Link key={item.href} href={item.href} className="utility-link">
                  {item.label}
                </Link>
              ))}
            </div>
            <label className="locale-select locale-select--header">
              <span className="sr-only">Dil</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                aria-label="Dil"
              >
                <option value="tr">TR</option>
                <option value="en">EN</option>
                <option value="uk">UK</option>
                <option value="ru">RU</option>
              </select>
            </label>
            {showUserSession ? (
              <>
                <span className="user-pill" title={session?.companyId}>
                  <span className="user-avatar" aria-hidden>
                    {session?.emailAddress.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="user-email">{session?.emailAddress}</span>
                </span>
                <button type="button" className="btn-outline-header" onClick={logout}>
                  Çıkış
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-premium-header">
                Giriş yap
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="site-header-main">
        <div className="site-header-main-inner site-header-main-inner--stacked">
          <SiteBrand href="/hizmetler" size="lg" />
          <div className="site-header-menus">
            <nav className="site-nav-block" aria-label="Platform menüsü">
              <span className="site-nav-label">Platform</span>
              <div className="site-nav">
                {PLATFORM_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive(item.href) ? "site-nav-link active" : "site-nav-link"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
            <nav className="site-nav-block" aria-label="Kurumsal menü">
              <span className="site-nav-label">Kurumsal</span>
              <div className="site-nav site-nav--corporate">
                {CORPORATE_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isActive(item.href)
                        ? "site-nav-link site-nav-link--corp active"
                        : "site-nav-link site-nav-link--corp"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
