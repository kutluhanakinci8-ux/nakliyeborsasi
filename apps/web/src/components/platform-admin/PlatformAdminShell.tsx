"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import "../../app/platform-admin-premium.css";
import { PLATFORM_MONOGRAM } from "../../lib/platformBranding";
import {
  PLATFORM_ADMIN_NAV,
  flattenPlatformAdminNav,
} from "../../lib/platformAdminNavigation";
import { PLATFORM_ADMIN_NAV_ICONS } from "../../lib/platformAdminNavIcons";
import { useWebSession } from "../../context/WebSessionProvider";

const deploySha = process.env.NEXT_PUBLIC_DEPLOY_SHA ?? "dev";
const deployTime = process.env.NEXT_PUBLIC_DEPLOY_TIME ?? "";

function resolvePageTitle(pathname: string): string {
  const item = flattenPlatformAdminNav().find((entry) =>
    entry.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(entry.href),
  );
  return item?.label ?? "Yönetim";
}

export function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useWebSession();
  const pageTitle = resolvePageTitle(pathname);

  return (
    <div className="platform-admin">
      <aside className="platform-admin-sidebar platform-admin-sidebar--premium">
        <div className="platform-admin-brand platform-admin-brand--premium">
          <span className="platform-admin-brand-mark">{PLATFORM_MONOGRAM}</span>
          <div>
            <strong>Global ops</strong>
            <span>Lerta Logistics</span>
          </div>
        </div>
        <p className="platform-admin-corridor-strip">TR · UA · EU · Global</p>
        <nav className="platform-admin-nav" aria-label="Platform yönetimi">
          {PLATFORM_ADMIN_NAV.map((section) => (
            <div key={section.id} className="platform-admin-nav-section">
              <p className="platform-admin-nav-title">{section.title}</p>
              <ul>
                {section.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={
                          active
                            ? "platform-admin-nav-link platform-admin-nav-link--premium active"
                            : "platform-admin-nav-link platform-admin-nav-link--premium"
                        }
                        title={item.description}
                      >
                        <span className="pa-nav-icon" aria-hidden>
                          {PLATFORM_ADMIN_NAV_ICONS[item.href] ?? "•"}
                        </span>
                        <span className="platform-admin-nav-link-text">
                          <span>{item.label}</span>
                          <span className="platform-admin-nav-link-desc">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="platform-admin-sidebar-foot">
          <Link
            href="/marketplace"
            className="platform-admin-foot-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Canlı siteye git →
          </Link>
        </div>
      </aside>
      <div className="platform-admin-main">
        <header className="platform-admin-topbar platform-admin-topbar--premium">
          <div>
            <p className="platform-admin-topbar-eyebrow">
              Platform operatörü · {pageTitle}
            </p>
            <p className="platform-admin-topbar-user">
              {session?.emailAddress ?? "—"}
            </p>
          </div>
          <div className="platform-admin-topbar-actions">
            <nav className="pa-topbar-quick" aria-label="Hızlı erişim">
              <Link href="/admin">Kontrol</Link>
              <Link href="/admin/organizasyon">Firmalar</Link>
              <Link href="/admin/bildirimler">Mail</Link>
            </nav>
            <span
              className="platform-admin-deploy-pill"
              title={deployTime || undefined}
            >
              Build {deploySha.slice(0, 7)}
            </span>
            <button
              type="button"
              className="platform-admin-btn-ghost"
              onClick={() => {
                logout();
                router.replace("/admin/login");
              }}
            >
              Güvenli çıkış
            </button>
          </div>
        </header>
        <main className="platform-admin-content">{children}</main>
      </div>
    </div>
  );
}
