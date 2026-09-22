"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { PLATFORM_ADMIN_NAV } from "../../lib/platformAdminNavigation";
import { useWebSession } from "../../context/WebSessionProvider";

export function PlatformAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useWebSession();

  return (
    <div className="platform-admin">
      <aside className="platform-admin-sidebar">
        <div className="platform-admin-brand">
          <span className="platform-admin-brand-mark">NB</span>
          <div>
            <strong>Platform yönetimi</strong>
            <span>Nakliye Borsası</span>
          </div>
        </div>
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
                            ? "platform-admin-nav-link active"
                            : "platform-admin-nav-link"
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="platform-admin-sidebar-foot">
          <Link href="/marketplace" className="platform-admin-foot-link">
            Canlı siteye git
          </Link>
        </div>
      </aside>
      <div className="platform-admin-main">
        <header className="platform-admin-topbar">
          <div>
            <p className="platform-admin-topbar-eyebrow">Platform operatörü</p>
            <p className="platform-admin-topbar-user">
              {session?.emailAddress ?? "—"}
            </p>
          </div>
          <div className="platform-admin-topbar-actions">
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
