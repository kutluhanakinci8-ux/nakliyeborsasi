"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteBrand } from "./SiteBrand";
import { UserAccountMenu } from "./UserAccountMenu";
import { useWebSession } from "../context/WebSessionProvider";
import {
  CORPORATE_DROPDOWN_ITEMS,
  DRIVER_PORTAL_NAV_ITEM,
  HIZMETLER_NAV_ITEM,
  isMessagingNavActive,
  MESSAGING_NAV_HREF,
  PLATFORM_NAV_ITEMS,
} from "../lib/siteNavigation";
import { useMesajlarNavBadge } from "../hooks/useMesajlarNavBadge";
import { useLertaCommsPortal } from "../hooks/useLertaCommsPortal";

type SiteHeaderProps = {
  variant?: "public" | "app";
  commsPortal?: boolean;
};

export function SiteHeader({ variant = "app", commsPortal }: SiteHeaderProps) {
  const pathname = usePathname();
  const { session, locale, setLocale, accessToken } = useWebSession();
  const isCommsPortalHost = useLertaCommsPortal();
  const isCommsPortal = commsPortal ?? isCommsPortalHost;
  const mesajlarUnread = useMesajlarNavBadge(accessToken, locale);
  const mesajHref = isCommsPortal
    ? "/messaging?tab=sohbet"
    : MESSAGING_NAV_HREF;
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
  const isFleetDriver = session?.roleCodes?.includes("FLEET_DRIVER") ?? false;

  return (
    <header
      className={
        variant === "public" ? "site-header site-header--public" : "site-header site-header--app"
      }
    >
      <div className="site-header-utility">
        <div className="site-header-utility-inner">
          <span className="utility-badge">
            <span className="utility-dot" aria-hidden />
            {isCommsPortal
              ? "Lerta platform · U88 · Posta · Mesaj"
              : "TR · UA · EU koridoru"}
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
              <UserAccountMenu />
            ) : (
              <>
                <Link href="/login?mode=register" className="btn-outline-header">
                  Üye ol
                </Link>
                <Link href="/login" className="btn-premium-header">
                  Giriş yap
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="site-header-main">
        <div className="site-header-main-inner">
          <SiteBrand
            href={isCommsPortal ? mesajHref : "/hizmetler"}
            size="lg"
            productName={isCommsPortal ? "Lerta Mesaj" : undefined}
            monogram={isCommsPortal ? "M" : undefined}
            tagline={isCommsPortal ? "Firma sohbeti" : undefined}
          />
          <nav className="site-nav-shell" aria-label="Ana menü">
            <div className="site-nav">
              {isCommsPortal ? (
                <>
                  <a
                    href="https://u88.lerta.com.tr/"
                    className="site-nav-link"
                  >
                    U88
                  </a>
                  <a
                    href="https://posta.lerta.com.tr/login"
                    className="site-nav-link"
                  >
                    Posta
                  </a>
                  <Link
                    href={mesajHref}
                    className={
                      isMessagingNavActive(pathname)
                        ? "site-nav-link active"
                        : "site-nav-link"
                    }
                  >
                    Mesajlar
                    {mesajlarUnread > 0 ? (
                      <span
                        className="site-nav-badge"
                        aria-label={`${mesajlarUnread} okunmamış`}
                      >
                        {mesajlarUnread > 99 ? "99+" : mesajlarUnread}
                      </span>
                    ) : null}
                  </Link>
                </>
              ) : null}
              {!isCommsPortal && isFleetDriver ? (
                <Link
                  href={DRIVER_PORTAL_NAV_ITEM.href}
                  className={
                    isActive(DRIVER_PORTAL_NAV_ITEM.href)
                      ? "site-nav-link active"
                      : "site-nav-link"
                  }
                >
                  {DRIVER_PORTAL_NAV_ITEM.label}
                </Link>
              ) : null}
              {!isCommsPortal
                ? PLATFORM_NAV_ITEMS.map((item) => {
                const isMesajlar = item.href === MESSAGING_NAV_HREF;
                const active = isMesajlar
                  ? isMessagingNavActive(pathname)
                  : isActive(item.href);
                const badge =
                  isMesajlar && mesajlarUnread > 0 ? mesajlarUnread : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active ? "site-nav-link active" : "site-nav-link"
                    }
                  >
                    {item.label}
                    {badge > 0 ? (
                      <span className="site-nav-badge" aria-label={`${badge} okunmamış`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </Link>
                );
                })
                : null}
              {!isCommsPortal ? (
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
              ) : null}
              {!isCommsPortal ? (
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
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
