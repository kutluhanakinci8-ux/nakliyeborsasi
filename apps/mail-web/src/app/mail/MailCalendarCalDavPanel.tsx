"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCalendarCalDavAccount,
  deleteCalendarCalDavAccount,
  fetchCalendarCalDavAccounts,
  syncAllCalendarCalDavAccounts,
  syncCalendarCalDavAccount,
  type MailCalendarCalDavAccount,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onSynced: () => void;
};

export function MailCalendarCalDavPanel({
  accessToken,
  onToast,
  onSynced,
}: Props) {
  const { t, formatDateTime } = useMailLocale();
  const [accounts, setAccounts] = useState<MailCalendarCalDavAccount[]>([]);
  const [label, setLabel] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendarCalDavAccounts(accessToken);
      setAccounts(data.accounts);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("calCalDavLoadErr"),
      );
    }
  }, [accessToken, onToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>{t("calCalDavTitle")}</h2>
        {accounts.some((a) => a.enabled) ? (
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
            disabled={syncingAll}
            onClick={() =>
              void (async () => {
                setSyncingAll(true);
                try {
                  const r = await syncAllCalendarCalDavAccounts(accessToken);
                  onToast(
                    t("calCalDavBulkResult", {
                      succeeded: r.succeeded,
                      accounts: r.accounts,
                      imported: r.imported,
                      updated: r.updated,
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
            {syncingAll ? t("calCalDavPulling") : t("calCalDavPullAll")}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">{t("calCalDavHint")}</p>
      <div className="mail-cal-preset-row">
        <button
          type="button"
          className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
          onClick={() => {
            setLabel(t("calGoogleTitle"));
            setCalendarUrl("https://apidata.googleusercontent.com/caldav/v2/");
          }}
        >
          {t("calCalDavPresetGoogle")}
        </button>
        <button
          type="button"
          className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
          onClick={() => {
            setLabel("Outlook");
            setCalendarUrl("https://outlook.office365.com/caldav/");
          }}
        >
          {t("calCalDavPresetOutlook")}
        </button>
      </div>
      <div className="mail-cal-form-grid mail-cal-form-grid--compact">
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("calCalDavFieldName")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("calCalDavNamePlaceholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="mail-cal-field mail-cal-field--full">
          <span className="mail-cal-field-label">{t("calCalDavFieldUrl")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("calCalDavUrlPlaceholder")}
            value={calendarUrl}
            onChange={(e) => setCalendarUrl(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("calCalDavFieldUser")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("calCalDavUserPlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("calCalDavFieldPassword")}</span>
          <input
            className="mail-cal-input"
            type="password"
            placeholder={t("calCalDavPasswordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="mail-cal-form-actions mail-cal-form-actions--inline">
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--primary"
            onClick={() =>
              void (async () => {
                if (
                  !label.trim() ||
                  !calendarUrl.trim() ||
                  !username.trim() ||
                  !password
                ) {
                  onToast(t("calCalDavAllFieldsRequired"));
                  return;
                }
                try {
                  await createCalendarCalDavAccount(accessToken, {
                    label: label.trim(),
                    calendarUrl: calendarUrl.trim(),
                    username: username.trim(),
                    password,
                  });
                  setLabel("");
                  setCalendarUrl("");
                  setUsername("");
                  setPassword("");
                  onToast(t("calCalDavAdded"));
                  void load();
                } catch (error) {
                  onToast(
                    error instanceof Error ? error.message : t("errGenericSave"),
                  );
                }
              })()
            }
          >
            {t("calCalDavConnect")}
          </button>
        </div>
      </div>
      <ul className="mail-cal-feed-list">
        {accounts.map((a) => (
          <li key={a.id} className="mail-cal-feed-item">
            <div>
              <strong>{a.label}</strong>
              <div className="mail-d6-meta">
                {a.username} ·{" "}
                {a.writeEnabled
                  ? t("calCalDavWriteEnabled")
                  : t("calCalDavReadOnly")}
                <br />
                {a.lastSyncedAt
                  ? t("settingsLastSync", {
                      date: formatDateTime(a.lastSyncedAt),
                    })
                  : t("settingsNotSyncedYet")}
                {a.lastSyncError
                  ? t("calErrorSuffix", { error: a.lastSyncError })
                  : ""}
              </div>
            </div>
            <span className="mail-cal-event-actions">
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                onClick={() =>
                  void syncCalendarCalDavAccount(accessToken, a.id)
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
                {t("calCalDavPull")}
              </button>
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteCalendarCalDavAccount(accessToken, a.id)
                    .then(() => {
                      onToast(t("calCalDavAccountDeleted"));
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
        {accounts.length === 0 ? (
          <li className="mail-cal-feed-empty">{t("calCalDavEmpty")}</li>
        ) : null}
      </ul>
    </section>
  );
}
