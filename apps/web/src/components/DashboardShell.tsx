"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { PublicApiConfiguration } from "../lib/PublicApiConfiguration";
import { useWebSession } from "../context/WebSessionProvider";

const NAV_ITEMS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/auctions", label: "İhaleler" },
  { href: "/messaging", label: "Mesajlar" },
  { href: "/trust", label: "Güven" },
  { href: "/integrations", label: "Entegrasyon" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, locale, setLocale, logout } = useWebSession();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">NB</span>
          <div>
            <p className="brand-title">Nakliye Borsası</p>
            <p className="brand-sub">TR · UA–EU</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="sidebar-api">{PublicApiConfiguration.resolveBaseUrl()}</p>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-meta">
            {session ? (
              <span className="company-chip" title={session.companyId}>
                {session.emailAddress}
              </span>
            ) : null}
            <label className="locale-select">
              Dil
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              >
                <option value="tr">TR</option>
                <option value="en">EN</option>
                <option value="uk">UK</option>
                <option value="ru">RU</option>
              </select>
            </label>
          </div>
          <button type="button" className="btn-secondary" onClick={logout}>
            Çıkış
          </button>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
