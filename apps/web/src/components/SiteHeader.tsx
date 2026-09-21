"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteBrand } from "./SiteBrand";
import { useWebSession } from "../context/WebSessionProvider";

const NAV_ITEMS = [
  { href: "/marketplace", label: "Yük arama" },
  { href: "/auctions", label: "İhaleler" },
  { href: "/messaging", label: "Mesajlar" },
  { href: "/trust", label: "Güven" },
  { href: "/integrations", label: "Entegrasyon" },
] as const;

type SiteHeaderProps = {
  variant?: "public" | "app";
};

export function SiteHeader({ variant = "app" }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session, locale, setLocale, logout } = useWebSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="site-header-utility">
        <div className="site-header-utility-inner">
          <span className="utility-badge">
            <span className="utility-dot" aria-hidden />
            TR · UA · EU koridoru
          </span>
          <div className="utility-actions">
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
            {variant === "app" && session ? (
              <>
                <span className="user-pill" title={session.companyId}>
                  <span className="user-avatar" aria-hidden>
                    {session.emailAddress.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="user-email">{session.emailAddress}</span>
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
        <div className="site-header-main-inner">
          <SiteBrand href="/marketplace" size="lg" />
          <nav className="site-nav-shell" aria-label="Ana menü">
            <div className="site-nav">
              {NAV_ITEMS.map((item) => (
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
        </div>
      </div>
    </header>
  );
}
