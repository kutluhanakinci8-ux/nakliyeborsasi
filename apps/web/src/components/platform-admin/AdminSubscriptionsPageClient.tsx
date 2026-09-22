"use client";

import { useEffect, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminSubscriptionsPageClient() {
  const { accessToken } = useWebSession();
  const [subs, setSubs] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchSubscriptions>>["subscriptions"]
  >([]);
  const [plans, setPlans] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchSubscriptions(accessToken)
      .then((payload) => {
        setSubs(payload.subscriptions);
        setPlans(payload.plans.map((p) => p.planCode));
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Abonelikler</h1>
        <p className="platform-admin-page-lead">
          Plan kataloğu: {plans.join(" · ") || "—"}
        </p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="Abonelik kaydı yok."
        rows={subs}
        columns={[
          { key: "company", header: "Firma", render: (r) => r.companyLegalName },
          { key: "plan", header: "Plan", render: (r) => r.planCode },
          {
            key: "active",
            header: "Aktif",
            render: (r) => (r.isActive ? "Evet" : "Hayır"),
          },
          {
            key: "since",
            header: "Başlangıç",
            render: (r) => new Date(r.createdAt).toLocaleDateString("tr-TR"),
          },
        ]}
      />
    </section>
  );
}
