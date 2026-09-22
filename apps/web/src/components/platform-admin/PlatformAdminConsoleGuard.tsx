"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isPlatformAdmin } from "../../lib/platformAdmin";
import { useWebSession } from "../../context/WebSessionProvider";
import { PlatformAdminShell } from "./PlatformAdminShell";

export function PlatformAdminConsoleGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isReady } = useWebSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!session) {
      router.replace("/admin/login");
      return;
    }
    if (!isPlatformAdmin(session)) {
      router.replace("/marketplace");
    }
  }, [isReady, session, router]);

  if (!isReady || !session || !isPlatformAdmin(session)) {
    return <div className="platform-admin-loading">Yönetim paneli yükleniyor…</div>;
  }

  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
