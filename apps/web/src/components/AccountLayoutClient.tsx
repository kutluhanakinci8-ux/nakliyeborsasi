"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { resolveAccountPageMeta } from "../lib/accountNavigation";
import { AccountPageShell } from "./AccountPageShell";

type AccountLayoutClientProps = {
  children: ReactNode;
};

export function AccountLayoutClient({ children }: AccountLayoutClientProps) {
  const pathname = usePathname();
  const meta = resolveAccountPageMeta(pathname);

  if (!meta) {
    return <>{children}</>;
  }

  return (
    <AccountPageShell
      title={meta.label}
      lead={meta.lead}
      hidePageHero={meta.hidePageHero}
    >
      {children}
    </AccountPageShell>
  );
}
