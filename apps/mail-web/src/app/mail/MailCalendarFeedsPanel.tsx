"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCalendarIcsFeed,
  deleteCalendarIcsFeed,
  fetchCalendarIcsFeeds,
  syncAllCalendarIcsFeeds,
  syncCalendarIcsFeed,
  type MailCalendarIcsFeed,
  isMailSessionExpiredError,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

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
  const { t, formatDateTime } = useMailLocale();
  const [feeds, setFeeds] = useState<MailCalendarIcsFeed[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await fetchCalendarIcsFeeds(accessToken);
      setFeeds(data.feeds);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("calFeedsLoadErr");
      setLoadError(message);
      if (!isMailSessionExpiredError(error)) {
        onToast(message);
      }
    }
  }, [accessToken, onToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>{t("calFeedsTitle")}</h2>
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
                    t("calFeedsSyncAllResult", {
                      succeeded: r.succeeded,
                      feeds: r.feeds,
                      imported: r.imported,
                      updated: r.updated,
                      removed: r.removed,
                      failedSuffix: r.failed
                        ? t("calCalDavBulkFailedSuffix", { failed: r.failed })
                        : "",
                    }),
                  );
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : t("calCalDavBulkSyncErr"),
                  );
                  void load();
                } finally {
                  setSyncingAll(false);
                }
              })()
            }
          >
            {syncingAll ? t("settingsSyncBusy") : t("settingsSyncAll")}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">{t("calFeedsHint")}</p>
      <div className="mail-cal-form-grid mail-cal-form-grid--compact">
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("calCalDavFieldName")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("calFeedsNamePlaceholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="mail-cal-field mail-cal-field--grow">
          <span className="mail-cal-field-label">{t("calFeedsFieldUrl")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("calFeedsUrlPlaceholder")}
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
                  onToast(t("calFeedsNameUrlRequired"));
                  return;
                }
                try {
                  await createCalendarIcsFeed(accessToken, {
                    label: label.trim(),
                    feedUrl: feedUrl.trim(),
                  });
                  setLabel("");
                  setFeedUrl("");
                  onToast(t("calFeedsAdded"));
                  void load();
                } catch (error) {
                  onToast(
                    error instanceof Error ? error.message : t("errGenericSave"),
                  );
                }
              })()
            }
          >
            {t("calActionAdd")}
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
                  ? t("settingsLastSync", {
                      date: formatDateTime(f.lastSyncedAt),
                    })
                  : t("settingsNotSyncedYet")}
                {f.lastSyncError
                  ? t("calErrorSuffix", { error: f.lastSyncError })
                  : ""}
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
                        t("calCalDavSyncResult", {
                          imported: r.imported,
                          updated: r.updated,
                          removed: r.removed,
                        }),
                      );
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error
                          ? err.message
                          : t("settingsSyncFailed"),
                      );
                      void load();
                    })
                }
              >
                {t("calFeedsSyncBtn")}
              </button>
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteCalendarIcsFeed(accessToken, f.id)
                    .then(() => {
                      onToast(t("calFeedsDeleted"));
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error ? err.message : t("errGenericSave"),
                      );
                    })
                }
              >
                {t("actionDelete")}
              </button>
            </span>
          </li>
        ))}
        {loadError ? (
          <li className="mail-cal-feed-empty mail-cal-feed-empty--warn">
            {loadError}
          </li>
        ) : null}
        {feeds.length === 0 && !loadError ? (
          <li className="mail-cal-feed-empty">{t("calFeedsEmpty")}</li>
        ) : null}
      </ul>
    </section>
  );
}
