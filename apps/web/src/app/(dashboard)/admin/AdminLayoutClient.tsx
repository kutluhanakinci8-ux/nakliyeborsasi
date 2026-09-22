"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isPlatformAdmin } from "../../../lib/platformAdmin";
import { useWebSession } from "../../../context/WebSessionProvider";

const ADMIN_NAV = [
  { href: "/admin", label: "Özet" },
  { href: "/admin/organizasyon", label: "Organizasyon yönetimi" },
] as const;

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isReady } = useWebSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isPlatformAdmin(session)) {
      router.replace("/marketplace");
    }
  }, [isReady, session, router]);

  if (!isReady || !session || !isPlatformAdmin(session)) {
    return <div className="loading-screen">Yükleniyor…</div>;
  }

  return (
    <div className="admin-shell module-page">
      <header className="exchange-hero admin-hero">
        <div>
          <p className="exchange-eyebrow">Platform</p>
          <h1 className="exchange-title">Yönetim paneli</h1>
          <p className="exchange-lead">
            Kurumsal organizasyon, doğrulama ve hesap ayarları — kullanıcıların gördüğü
            sayfalarla birebir senkron (demo depolama).
          </p>
        </div>
        <Link href="/hesap/organizasyon" className="btn-account-ghost">
          Kullanıcı görünümü
        </Link>
      </header>
      <nav className="admin-nav" aria-label="Admin bölümleri">
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "admin-nav-link active" : "admin-nav-link"}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="admin-body">{children}</div>
    </div>
  );
}
