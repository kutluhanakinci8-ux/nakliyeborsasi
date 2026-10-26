"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useWebSession } from "../../context/WebSessionProvider";
import { resolveOpenSourceLicensesMailUrl } from "../../lib/lertaOpenSourceLicensesUrl";

type Props = {
  children: ReactNode;
  activeNav?: "posta-ve-mesaj";
};

export function EkolojikMarketShell({ children, activeNav }: Props) {
  const { accessToken } = useWebSession();
  const ossLicensesHref = resolveOpenSourceLicensesMailUrl(accessToken);

  return (
    <div className="ekolojik-market-app">
      <header className="ekolojik-market-topbar">
        <div className="ekolojik-market-topbar-brand">
          <span className="ekolojik-market-leaf" aria-hidden>🌿</span>
          <span className="ekolojik-market-title">Marketim</span>
        </div>
        <nav className="ekolojik-market-topnav" aria-label="Marketim">
          <Link href="/marketim/posta-ve-mesaj" className="ekolojik-market-topnav-link">
            Panel
          </Link>
          <span className="ekolojik-market-topnav-link ekolojik-market-topnav-link--muted">
            Satış
          </span>
          <span className="ekolojik-market-topnav-link ekolojik-market-topnav-link--muted">
            Stok
          </span>
          <Link
            href="/marketim/posta-ve-mesaj"
            className={
              activeNav === "posta-ve-mesaj"
                ? "ekolojik-market-topnav-link ekolojik-market-topnav-link--active"
                : "ekolojik-market-topnav-link"
            }
          >
            Posta
          </Link>
        </nav>
      </header>
      <main className="ekolojik-market-main">{children}</main>
      <footer className="ekolojik-market-footer">
        <a
          href={ossLicensesHref}
          className="ekolojik-market-footer-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Açık kaynak lisansları
        </a>
      </footer>
    </div>
  );
}
