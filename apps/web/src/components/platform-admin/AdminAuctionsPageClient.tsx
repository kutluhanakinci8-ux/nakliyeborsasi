"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminAuctionsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchAuctions>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchAuctions(accessToken)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">İhaleler</h1>
        <p className="platform-admin-page-lead">
          Yük veren ilanlarına bağlı ihale oturumları ve teklif sayıları.
        </p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="İhale yok — API yeniden başlatıldığında seed oluşturur."
        rows={rows}
        columns={[
          { key: "status", header: "Durum", render: (r) => r.statusCode },
          {
            key: "min",
            header: "Min. teklif",
            render: (r) => `${r.minimumBidAmount} ${r.currencyCode}`,
          },
          { key: "bids", header: "Teklif", render: (r) => r.bidCount },
          {
            key: "ends",
            header: "Bitiş",
            render: (r) => new Date(r.endsAt).toLocaleString("tr-TR"),
          },
          {
            key: "listing",
            header: "İlan",
            render: (r) => `${r.freightListingId.slice(0, 8)}…`,
          },
        ]}
      />
    </section>
  );
}
