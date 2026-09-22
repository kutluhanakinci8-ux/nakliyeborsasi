"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

/** Ödeme modülü yok; aktif abonelikleri tahsilat özeti olarak gösterir */
export function AdminPaymentsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchSubscriptions>>["subscriptions"]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchSubscriptions(accessToken)
      .then((p) => setRows(p.subscriptions.filter((s) => s.isActive)))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Ödemeler ve faturalar</h1>
        <p className="platform-admin-page-lead">
          Fatura entegrasyonu henüz yok; aktif paketler (abonelik) listelenir.
        </p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="Aktif abonelik yok."
        rows={rows}
        columns={[
          { key: "company", header: "Firma", render: (r) => r.companyLegalName },
          { key: "plan", header: "Paket", render: (r) => r.planCode },
          {
            key: "status",
            header: "Tahsilat",
            render: () => "Demo — ödeme bekleniyor",
          },
        ]}
      />
    </section>
  );
}
