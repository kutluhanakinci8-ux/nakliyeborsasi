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
    <section className="mail-cal-feeds">
      <h2>Harici takvim (iCal URL)</h2>
      <p className="mail-d6-hint">
        Nextcloud / Google “gizli iCal adresi” gibi HTTPS bağlantılarını ekleyin.
        Etkin akışlar sunucuda saatlik otomatik senkronize edilir; tam CalDAV
        yazma sonraki fazda.
      </p>
      {feeds.some((f) => f.enabled) ? (
        <button
          type="button"
          className="mail-d6-sync-all"
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
      <div className="mail-d6-form">
        <input
          placeholder="Ad (ör. Nextcloud)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          placeholder="https://…/calendar.ics"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
        />
        <button
          type="button"
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
      <ul className="mail-d6-list">
        {feeds.map((f) => (
          <li key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <div className="mail-d6-meta">
                {f.lastSyncedAt
                  ? `Son senkron: ${new Date(f.lastSyncedAt).toLocaleString("tr-TR")}`
                  : "Henüz senkron yok"}
                {f.lastSyncError ? ` · Hata: ${f.lastSyncError}` : ""}
              </div>
            </div>
            <span className="mail-d6-actions">
              <button
                type="button"
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
                className="mail-d6-danger"
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
          <li className="mail-d6-empty">Harici takvim yok.</li>
        ) : null}
      </ul>
    </section>
  );
}
