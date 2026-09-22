"use client";

import { useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { AdminDataTable } from "./AdminDataTable";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminUsersPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchUsers>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchUsers(accessToken)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <section className="platform-admin-panel">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Kullanıcılar</h1>
        <p className="platform-admin-page-lead">
          Tüm üye hesapları — test: @test.nakliyeborsasi.local · şifre TestPass123!
        </p>
      </header>
      <AdminDataTable
        loading={loading}
        emptyMessage="Henüz kullanıcı yok."
        rows={rows}
        columns={[
          { key: "email", header: "E-posta", render: (r) => r.emailAddress },
          { key: "name", header: "Ad", render: (r) => r.displayName },
          { key: "company", header: "Firma", render: (r) => r.companyLegalName },
          {
            key: "type",
            header: "Pazar rolü",
            render: (r) => formatParticipantType(r.participantTypeCode),
          },
          { key: "roles", header: "Rol", render: (r) => r.roleCodes.join(", ") },
        ]}
      />
    </section>
  );
}
