"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCalendarIcsFeed,
  deleteCalendarIcsFeed,
  fetchCalendarIcsFeeds,
  syncAllCalendarIcsFeeds,
  syncCalendarIcsFeed,
  type MailCalendarIcsFeed,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onSynced: () => void;
};

export function MailCalendarFeedsPanel({
  accessToken,
  onToast,
  onSynced,
}: Props) {
  const [feeds, setFeeds] = useState<MailCalendarIcsFeed[]>([]);
  const [label, setLabel] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendarIcsFeeds(accessToken);
      setFeeds(data.feeds);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Akışlar yüklenemedi.",
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>Harici takvim (iCal URL)</h2>
        {feeds.some((f) => f.enabled) ? (
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
            disabled={syncingAll}
            onClick={() =>
              void (async () => {
                setSyncingAll(true);
                try {
                  const r = await syncAllCalendarIcsFeeds(accessToken);
                  onToast(
                    `Tümü: ${r.succeeded}/${r.feeds} akış · ${r.imported} yeni, ${r.updated} güncel, ${r.removed} kaldırıldı${r.failed ? ` · ${r.failed} hata` : ""}.`,
                  );
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : "Toplu senkron başarısız.",
                  );
                  void load();
                } finally {
                  setSyncingAll(false);
                }
              })()
            }
          >
            {syncingAll ? "Senkronize ediliyor…" : "Tümünü senkronize et"}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">
        Nextcloud / Google “gizli iCal adresi” veya Outlook yayımlanan ICS
        bağlantılarını ekleyin. Etkin akışlar sunucuda saatlik otomatik
        senkronize edilir.
      </p>
      <div className="mail-cal-form-grid mail-cal-form-grid--compact">
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">Ad</span>
          <input
            className="mail-cal-input"
            placeholder="ör. Nextcloud, MSN"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="mail-cal-field mail-cal-field--grow">
          <span className="mail-cal-field-label">iCal URL</span>
          <input
            className="mail-cal-input"
            placeholder="https://…/calendar.ics"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
          />
        </label>
        <div className="mail-cal-form-actions mail-cal-form-actions--inline">
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--primary"
            onClick={() =>
              void (async () => {
                if (!label.trim() || !feedUrl.trim()) {
                  onToast("Ad ve URL gerekli.");
                  return;
                }
                try {
                  await createCalendarIcsFeed(accessToken, {
                    label: label.trim(),
                    feedUrl: feedUrl.trim(),
                  });
                  setLabel("");
                  setFeedUrl("");
                  onToast("Harici takvim eklendi.");
                  void load();
                } catch (error) {
                  onToast(
                    error instanceof Error ? error.message : "Eklenemedi.",
                  );
                }
              })()
            }
          >
            Ekle
          </button>
        </div>
      </div>
      <ul className="mail-cal-feed-list">
        {feeds.map((f) => (
          <li key={f.id} className="mail-cal-feed-item">
            <div>
              <strong>{f.label}</strong>
              <div className="mail-d6-meta">
                {f.lastSyncedAt
                  ? `Son senkron: ${new Date(f.lastSyncedAt).toLocaleString("tr-TR")}`
                  : "Henüz senkron yok"}
                {f.lastSyncError ? ` · Hata: ${f.lastSyncError}` : ""}
              </div>
            </div>
            <span className="mail-cal-event-actions">
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                onClick={() =>
                  void syncCalendarIcsFeed(accessToken, f.id)
                    .then((r) => {
                      onToast(
                        `Senkron: ${r.imported} yeni, ${r.updated} güncel, ${r.removed} kaldırıldı.`,
                      );
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error
                          ? err.message
                          : "Senkron başarısız.",
                      );
                      void load();
                    })
                }
              >
                Senkronize
              </button>
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteCalendarIcsFeed(accessToken, f.id)
                    .then(() => {
                      onToast("Akış silindi.");
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error ? err.message : "Silinemedi.",
                      );
                    })
                }
              >
                Sil
              </button>
            </span>
          </li>
        ))}
        {feeds.length === 0 ? (
          <li className="mail-cal-feed-empty">Harici takvim yok.</li>
        ) : null}
      </ul>
    </section>
  );
}
