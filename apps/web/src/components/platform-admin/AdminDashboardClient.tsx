"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type PlatformAdminOverview,
} from "../../lib/PlatformAdminApiClient";
import { flattenPlatformAdminNav } from "../../lib/platformAdminNavigation";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminDashboardClient() {
  const { accessToken } = useWebSession();
  const [overview, setOverview] = useState<PlatformAdminOverview | null>(null);
  const modules = flattenPlatformAdminNav().filter((item) => item.href !== "/admin");

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void PlatformAdminApiClient.fetchOverview(accessToken).then(setOverview);
  }, [accessToken]);

  return (
    <div className="platform-admin-dashboard">
      <header className="platform-admin-panel-head">
        <h1 className="platform-admin-page-title">Kontrol merkezi</h1>
        <p className="platform-admin-page-lead">
          Canlı veritabanı özetleri. Test kullanıcıları, ilanlar, ihaleler ve
          mesajlar API seed ile doldurulur.
        </p>
      </header>
      <div className="platform-admin-stat-grid">
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview?.companies ?? "—"}
          </span>
          <span className="platform-admin-stat-label">Firma</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview?.users ?? "—"}
          </span>
          <span className="platform-admin-stat-label">Kullanıcı</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview?.listings ?? "—"}
          </span>
          <span className="platform-admin-stat-label">Yük ilanı</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview ? `${overview.openAuctions}/${overview.auctions}` : "—"}
          </span>
          <span className="platform-admin-stat-label">Açık ihale</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview?.messageThreads ?? "—"}
          </span>
          <span className="platform-admin-stat-label">Mesaj kanalı</span>
        </div>
        <div className="platform-admin-stat">
          <span className="platform-admin-stat-value">
            {overview?.trustReviews ?? "—"}
          </span>
          <span className="platform-admin-stat-label">Güven yorumu</span>
        </div>
      </div>
      <div className="platform-admin-module-grid">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="platform-admin-module-card">
            <h2>{module.label}</h2>
            <p>{module.description}</p>
            <span className="platform-admin-module-cta">Modüle git →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
