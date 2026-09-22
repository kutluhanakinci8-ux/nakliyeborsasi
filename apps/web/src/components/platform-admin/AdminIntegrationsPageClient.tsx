"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminIntegrationsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchAuditLogs>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchAuditLogs(accessToken)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Entegrasyonlar</h1>
        <p className="platform-admin-page-lead">
          Son API istekleri (audit log) — harici entegrasyon trafiği izleme.
        </p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="Audit kaydı yok (API kullanımı sonrası dolar)."
        rows={rows}
        columns={[
          { key: "method", header: "Metod", render: (r) => r.httpMethod },
          { key: "path", header: "Yol", render: (r) => r.requestPath },
          { key: "status", header: "HTTP", render: (r) => r.responseStatusCode },
          { key: "action", header: "Kod", render: (r) => r.actionCode },
        ]}
      />
    </section>
  );
}
