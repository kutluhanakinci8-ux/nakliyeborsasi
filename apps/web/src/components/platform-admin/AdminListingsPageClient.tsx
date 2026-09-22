"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminListingsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchListings>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchListings(accessToken)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Yük ilanları</h1>
        <p className="platform-admin-page-lead">Marketplace’teki tüm ilanlar (veritabanı).</p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="İlan bulunamadı."
        rows={rows}
        columns={[
          {
            key: "lane",
            header: "Hat",
            render: (r) => `${r.originCityName} → ${r.destinationCityName}`,
          },
          { key: "owner", header: "Sahip", render: (r) => r.ownerLegalName },
          { key: "eq", header: "Ekipman", render: (r) => r.equipmentTypeCode },
          {
            key: "price",
            header: "Fiyat",
            render: (r) =>
              r.priceAmount
                ? `${r.priceAmount} ${r.priceCurrencyCode ?? ""}`
                : "—",
          },
          { key: "date", header: "Yükleme", render: (r) => r.loadingDateStart },
        ]}
      />
    </section>
  );
}
