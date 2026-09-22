"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { ACCOUNT_MENU_ITEMS } from "../lib/accountNavigation";
import { AccountMenuIcon } from "./AccountMenuIcons";

type AccountPageShellProps = {
  title: string;
  lead: string;
  children: ReactNode;
};

export function AccountPageShell({ title, lead, children }: AccountPageShellProps) {
  const pathname = usePathname();

  return (
    <div className="account-page module-page">
      <header className="exchange-hero account-page-hero">
        <div>
          <p className="exchange-eyebrow">Hesap</p>
          <h1 className="exchange-title">{title}</h1>
          <p className="exchange-lead">{lead}</p>
        </div>
      </header>

      <nav className="account-tabs" aria-label="Hesap bölümleri">
        {ACCOUNT_MENU_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "account-tab active" : "account-tab"}
              aria-current={active ? "page" : undefined}
            >
              <span className="account-tab-icon" aria-hidden>
                <AccountMenuIcon id={item.icon} />
              </span>
              <span className="account-tab-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="account-page-body surface-stack">{children}</div>
    </div>
  );
}
