"use client";

import { useEffect, useState } from "react";
import { MessagingApiClient } from "../../lib/MessagingApiClient";
import { MessagingIntegrationApiClient } from "../../lib/MessagingIntegrationApiClient";

type Props = {
  accessToken: string;
  locale: string;
  isCompanyOwner: boolean;
};

export function MessagingKvkkRetentionPanel({
  accessToken,
  locale,
  isCompanyOwner,
}: Props) {
  const [retentionDays, setRetentionDays] = useState("");
  const [retentionMode, setRetentionMode] = useState<"archive" | "delete">(
    "archive",
  );
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isCompanyOwner || !accessToken) {
      return;
    }
    void MessagingIntegrationApiClient.fetchSnapshot(accessToken)
      .then((payload) => {
        const days = payload.integration.retention?.retentionDays;
        setRetentionDays(days != null ? String(days) : "");
        setRetentionMode(payload.integration.retention?.retentionMode ?? "archive");
      })
      .catch(() => setError("Saklama ayarları yüklenemedi"));
  }, [accessToken, isCompanyOwner]);

  if (!isCompanyOwner) {
    return (
      <p className="module-hint">
        KVKK dışa aktarma ve saklama politikası yalnızca firma sahibi tarafından
        yönetilir.
      </p>
    );
  }

  async function downloadKvkkExport(): Promise<void> {
    setExportBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = await MessagingApiClient.exportArchive(accessToken, locale);
      const blob = new Blob([JSON.stringify(payload.export, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ekolojik-messaging-kvkk-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Şirket mesaj arşivi indirildi (JSON).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma hatası");
    } finally {
      setExportBusy(false);
    }
  }

  async function saveRetention(): Promise<void> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const trimmed = retentionDays.trim();
      const days = trimmed === "" ? null : Number.parseInt(trimmed, 10);
      if (days !== null && (!Number.isFinite(days) || days < 30 || days > 3650)) {
        throw new Error("Saklama süresi 30–3650 gün veya boş (sınırsız) olmalı.");
      }
      await MessagingIntegrationApiClient.updateRetention(accessToken, {
        retentionDays: days,
        retentionMode,
      });
      setMessage("Saklama politikası kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="messaging-kvkk-retention-panel" aria-label="KVKK ve saklama">
      <h3 className="messaging-kvkk-retention-title">KVKK dışa aktarma</h3>
      <p className="module-hint">
        Firma sohbetlerinin tam JSON arşivi — eDiscovery ve veri sahibi talepleri için.
        Legal hold altındaki thread’ler silinmez.
      </p>
      <button
        type="button"
        className="btn-accent btn-accent--compact"
        disabled={exportBusy}
        onClick={() => void downloadKvkkExport()}
      >
        {exportBusy ? "Hazırlanıyor…" : "Şirket arşivini indir (JSON)"}
      </button>

      <h3 className="messaging-kvkk-retention-title messaging-kvkk-retention-title--spaced">
        Saklama politikası
      </h3>
      <p className="module-hint">
        Otomatik arşiv veya silme job’u (30–3650 gün). Boş bırakırsanız varsayılan
        platform süresi geçerli kalır.
      </p>
      <label className="messaging-kvkk-retention-field">
        <span>Gün sayısı (isteğe bağlı)</span>
        <input
          className="input-light"
          type="number"
          min={30}
          max={3650}
          placeholder="Örn. 365"
          value={retentionDays}
          onChange={(event) => setRetentionDays(event.target.value)}
        />
      </label>
      <label className="messaging-kvkk-retention-field">
        <span>Mod</span>
        <select
          className="input-light"
          value={retentionMode}
          onChange={(event) =>
            setRetentionMode(event.target.value as "archive" | "delete")
          }
        >
          <option value="archive">Arşiv (soft)</option>
          <option value="delete">Silme</option>
        </select>
      </label>
      <button
        type="button"
        className="messaging-kvkk-retention-save"
        disabled={busy}
        onClick={() => void saveRetention()}
      >
        {busy ? "Kaydediliyor…" : "Saklama politikasını kaydet"}
      </button>
      {message ? <p className="module-hint" role="status">{message}</p> : null}
      {error ? <p className="error banner error--light">{error}</p> : null}
    </section>
  );
}
