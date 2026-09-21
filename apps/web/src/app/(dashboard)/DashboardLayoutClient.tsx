"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { useWebSession } from "../../context/WebSessionProvider";

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, isReady } = useWebSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, isReady, router]);

  if (!isReady || !accessToken) {
    return <div className="loading-screen">Yükleniyor…</div>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
