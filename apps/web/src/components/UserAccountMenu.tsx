"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ACCOUNT_MENU_ITEMS,
  resolveAccountDisplayName,
  resolveAccountInitials,
} from "../lib/accountNavigation";
import { isPlatformAdmin } from "../lib/platformAdmin";
import { useWebSession } from "../context/WebSessionProvider";
import { AccountMenuIcon } from "./AccountMenuIcons";

export function UserAccountMenu() {
  const pathname = usePathname();
  const { session, logout } = useWebSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!session) {
    return null;
  }

  const displayName = resolveAccountDisplayName(session.emailAddress);
  const initials = resolveAccountInitials(session.emailAddress);

  const accountSectionActive = ACCOUNT_MENU_ITEMS.some((item) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div className="user-account-menu" ref={rootRef}>
      <button
        type="button"
        className={
          open || accountSectionActive
            ? "user-account-trigger is-open"
            : "user-account-trigger"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-account-menu-panel"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className="user-account-trigger-label">{displayName}</span>
        <span className="user-account-avatar" aria-hidden>{initials}</span>
        <span className="user-account-caret" aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      <div
        id="user-account-menu-panel"
        className={open ? "user-account-panel is-open" : "user-account-panel"}
        role="menu"
        aria-hidden={!open}
      >
        {isPlatformAdmin(session) ? (
          <Link
            href="/admin/organizasyon"
            role="menuitem"
            className={
              pathname.startsWith("/admin")
                ? "user-account-item active"
                : "user-account-item"
            }
            onClick={() => setOpen(false)}
          >
            <span className="user-account-item-icon" aria-hidden>⚙</span>
            <span className="user-account-item-label">Platform yönetimi</span>
          </Link>
        ) : null}
        {ACCOUNT_MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "user-account-item active"
                : "user-account-item"
            }
            onClick={() => setOpen(false)}
          >
            <span className="user-account-item-icon">
              <AccountMenuIcon id={item.icon} />
            </span>
            <span className="user-account-item-label">{item.label}</span>
          </Link>
        ))}
        <div className="user-account-divider" role="separator" />
        <button
          type="button"
          role="menuitem"
          className="user-account-item user-account-item--logout"
          onClick={() => {
            setOpen(false);
            logout();
          }}
        >
          <span className="user-account-item-icon">
            <AccountMenuIcon id="logout" />
          </span>
          <span className="user-account-item-label">Sistemden dışarı</span>
        </button>
      </div>
    </div>
  );
}
