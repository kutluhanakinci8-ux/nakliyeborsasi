"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminTrustPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchTrustReviews>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchTrustReviews(accessToken)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Güven skorları</h1>
        <p className="platform-admin-page-lead">Firma değerlendirmeleri (seed + üye girişleri).</p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="Değerlendirme yok."
        rows={rows}
        columns={[
          { key: "score", header: "Puan", render: (r) => r.scoreValue },
          { key: "comment", header: "Yorum", render: (r) => r.commentText },
          {
            key: "target",
            header: "Hedef firma",
            render: (r) => `${r.targetCompanyId.slice(0, 8)}…`,
          },
          {
            key: "when",
            header: "Tarih",
            render: (r) => new Date(r.createdAt).toLocaleDateString("tr-TR"),
          },
        ]}
      />
    </section>
  );
}
