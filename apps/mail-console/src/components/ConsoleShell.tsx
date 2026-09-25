"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConsoleSession } from "@/lib/session";

export function ConsoleShell({
  children,
  operator,
}: {
  children: React.ReactNode;
  operator: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useConsoleSession();

  function navClass(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
      ? "active"
      : "";
  }

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <strong>Lerta Mail</strong>
        <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 12 }}>
          Yönetim
        </span>
        <nav>
          <Link className={navClass("/dashboard")} href="/dashboard">
            Özet
          </Link>
          <Link className={navClass("/domain")} href="/domain">
            Özel domain
          </Link>
          <Link className={navClass("/mailboxes")} href="/mailboxes">
            Posta kutuları
          </Link>
          <Link className={navClass("/upgrade")} href="/upgrade">
            Kurumsala geç
          </Link>
          <Link className={navClass("/team")} href="/team">
            Ekip
          </Link>
          {operator ? (
            <Link className={navClass("/operator")} href="/operator">
              Operatör
            </Link>
          ) : null}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <button
            type="button"
            className="btn secondary"
            style={{ width: "100%" }}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Çıkış
          </button>
        </div>
      </aside>
      <main className="shell-main">{children}</main>
    </div>
  );
}
