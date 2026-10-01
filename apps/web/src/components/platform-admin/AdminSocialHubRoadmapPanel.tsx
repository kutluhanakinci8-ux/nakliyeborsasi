"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type SocialHubRoadmapInterestStatsSnapshot,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminSocialHubRoadmapPanel() {
  const { accessToken } = useWebSession();
  const [snapshot, setSnapshot] = useState<SocialHubRoadmapInterestStatsSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const next =
        await PlatformAdminApiClient.fetchSocialHubRoadmapInterestStats(accessToken);
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return <p className="module-hint">Sosyal hub yol haritası yükleniyor…</p>;
  }

  if (!snapshot) {
    return null;
  }

  return (
    <section className="pa-panel" style={{ marginTop: "1.25rem" }}>
      <h2 className="pa-panel-title">Sosyal hub — yol haritası ilgi</h2>
      <p className="pa-panel-lead">
        Firmaların TikTok / YouTube öncelik bildirimleri (canlı veritabanı sayımı).
      </p>
      <p className="module-hint">
        İlgi bildiren firma: <strong>{snapshot.interestedCompanyCount}</strong>
      </p>
      <table className="pa-table">
        <thead>
          <tr>
            <th>Kanal</th>
            <th>İlgi sayısı</th>
            <th>OAuth ortamı</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.platforms.map((row) => (
            <tr key={row.platformCode}>
              <td>{row.label}</td>
              <td>{row.interestedCompanyCount}</td>
              <td>{row.oauthEnvConfigured ? "Tanımlı" : "Eksik"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn-account-ghost" onClick={() => void refresh()}>
        Yenile
      </button>
    </section>
  );
}
