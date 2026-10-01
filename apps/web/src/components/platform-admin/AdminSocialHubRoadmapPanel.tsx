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

  const betaOps = snapshot.betaOps;

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

      {betaOps ? (
        <>
          <h3 className="pa-panel-title" style={{ marginTop: "1.5rem" }}>
            Beta kanal operasyonları
          </h3>
          <p className="pa-panel-lead">
            Bağlı firmalar, açık Mesajlar köprüsü konuşmaları ve son 24 saat giden
            denemeleri. Webhook köprü denetim kaydı (24s):{" "}
            <strong>{betaOps.webhookInboundBridged24h}</strong>. Sunucu webhook
            hazırlığı: TikTok köprü{" "}
            {betaOps.integrationWebhookReadiness.tiktok.webhookBridgeEnabled
              ? "açık"
              : "kapalı"}
            , YouTube köprü{" "}
            {betaOps.integrationWebhookReadiness.youtube.webhookBridgeEnabled
              ? "açık"
              : "kapalı"}
            .
          </p>
          <table className="pa-table">
            <thead>
              <tr>
                <th>Kanal</th>
                <th>Bağlı firma</th>
                <th>Açık konuşma</th>
                <th>24s giden (ok)</th>
                <th>24s giden (hata)</th>
              </tr>
            </thead>
            <tbody>
              {betaOps.platforms.map((row) => (
                <tr key={row.platformCode}>
                  <td>{row.label}</td>
                  <td>{row.connectedCompanyCount}</td>
                  <td>{row.openThreadCount}</td>
                  <td>{row.outboundOk24h}</td>
                  <td>{row.outboundFailed24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="pa-kv-list module-hint">
            <li>
              <span>TikTok webhook</span>
              <span>{betaOps.integrationWebhooks.tiktok}</span>
            </li>
            <li>
              <span>YouTube webhook</span>
              <span>{betaOps.integrationWebhooks.youtube}</span>
            </li>
          </ul>
        </>
      ) : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn-account-ghost" onClick={() => void refresh()}>
          Yenile
        </button>
        {accessToken ? (
          <>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={loading}
              onClick={() =>
                void PlatformAdminApiClient.downloadSocialHubRoadmapInterestCsv(
                  accessToken,
                )
              }
            >
              İlgi CSV
            </button>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={loading}
              onClick={() =>
                void PlatformAdminApiClient.downloadSocialHubRoadmapBetaOpsCsv(
                  accessToken,
                )
              }
            >
              Beta ops CSV
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
