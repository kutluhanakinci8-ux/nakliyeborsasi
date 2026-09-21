"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteBrand } from "./SiteBrand";
import { useWebSession } from "../context/WebSessionProvider";
import {
  CORPORATE_DROPDOWN_ITEMS,
  HIZMETLER_NAV_ITEM,
  PLATFORM_NAV_ITEMS,
} from "../lib/siteNavigation";

type SiteHeaderProps = {
  variant?: "public" | "app";
};

export function SiteHeader({ variant = "app" }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session, locale, setLocale, logout } = useWebSession();
  const [corporateOpen, setCorporateOpen] = useState(false);
  const corporateRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const corporateMenuActive = CORPORATE_DROPDOWN_ITEMS.some((item) =>
    isActive(item.href),
  );

  useEffect(() => {
    setCorporateOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!corporateRef.current?.contains(event.target as Node)) {
        setCorporateOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
        <div className="site-header-main-inner">
          <SiteBrand href="/hizmetler" size="lg" />
          <nav className="site-nav-shell" aria-label="Ana menü">
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
              <Link
                href={HIZMETLER_NAV_ITEM.href}
                className={
                  isActive(HIZMETLER_NAV_ITEM.href)
                    ? "site-nav-link active"
                    : "site-nav-link"
                }
              >
                {HIZMETLER_NAV_ITEM.label}
              </Link>
              <div className="site-nav-dropdown" ref={corporateRef}>
                <button
                  type="button"
                  className={
                    corporateMenuActive || corporateOpen
                      ? "site-nav-link site-nav-link--menu active"
                      : "site-nav-link site-nav-link--menu"
                  }
                  aria-expanded={corporateOpen}
                  aria-haspopup="menu"
                  aria-controls="corporate-nav-menu"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCorporateOpen((open) => !open);
                  }}
                >
                  Kurumsal
                  <span className="site-nav-caret" aria-hidden>
                    ▾
                  </span>
                </button>
                <div
                  id="corporate-nav-menu"
                  className={
                    corporateOpen
                      ? "site-nav-dropdown-panel is-open"
                      : "site-nav-dropdown-panel"
                  }
                  role="menu"
                  aria-hidden={!corporateOpen}
                >
                  {CORPORATE_DROPDOWN_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={
                        isActive(item.href)
                          ? "site-nav-dropdown-link active"
                          : "site-nav-dropdown-link"
                      }
                      onClick={() => setCorporateOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
