"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminSystemPageClient() {
  const { accessToken } = useWebSession();
  const [overview, setOverview] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchOverview>> | null
  >(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchOverview(accessToken).then(setOverview);
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Platform ayarları</h1>
        <p className="platform-admin-page-lead">
          Koridor TR · UA · EU — bakım modu ve duyurular sonraki sürümde.
        </p>
      </header>
      <ul className="admin-checklist">
        <li>API: {process.env.NEXT_PUBLIC_API_BASE_URL ?? "3010 (otomatik)"}</li>
        <li>Web: port 3011</li>
        <li>Veritabanı kayıt sayıları: firma {overview?.companies ?? "—"}, audit {overview?.auditLogs ?? "—"}</li>
        <li>Test şifresi: TestPass123! (@test.nakliyeborsasi.local)</li>
      </ul>
    </section>
  );
}
