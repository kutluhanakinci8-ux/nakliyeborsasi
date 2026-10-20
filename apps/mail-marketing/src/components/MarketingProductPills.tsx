"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PILLS = [
  { href: "/u88", label: "U88 · KVKK" },
  { href: "/posta", label: "Posta" },
  { href: "/mesaj", label: "Mesaj" },
  { href: "/posta#fiyatlar", label: "Fiyatlandırma" },
  { href: "/durum", label: "Durum" },
] as const;

export function MarketingProductPills() {
  const pathname = usePathname();

  return (
    <nav className="lerta-pill-nav" aria-label="Ürünler">
      {PILLS.map((pill) => {
        const base = pill.href.split("#")[0];
        const active =
          pathname === base ||
          (base !== "/" && pathname.startsWith(`${base}/`));
        return (
          <Link
            key={pill.href}
            href={pill.href}
            className={active ? "is-active" : undefined}
          >
            {pill.label}
          </Link>
        );
      })}
    </nav>
  );
}
