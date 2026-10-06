"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EkolojikMarketShell } from "../../components/ekolojik/EkolojikMarketShell";
import { useWebSession } from "../../context/WebSessionProvider";

export default function MarketimRootLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, isReady } = useWebSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!accessToken) {
      router.replace("/login?next=/marketim/posta-ve-mesaj");
    }
  }, [accessToken, isReady, router]);

  if (!isReady || !accessToken) {
    return <div className="loading-screen">Yükleniyor…</div>;
  }

  return (
    <EkolojikMarketShell activeNav="posta-ve-mesaj">{children}</EkolojikMarketShell>
  );
}
