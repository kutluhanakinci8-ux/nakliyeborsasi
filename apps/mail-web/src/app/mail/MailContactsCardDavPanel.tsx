"use client";

import { PasswordField } from "@/components/PasswordField";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useState } from "react";
import {
  createContactCardDavAccount,
  deleteContactCardDavAccount,
  fetchContactCardDavAccounts,
  syncAllContactCardDavAccounts,
  syncContactCardDavAccount,
  type MailContactCardDavAccount,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onSynced: () => void;
};

export function MailContactsCardDavPanel({
  accessToken,
  onToast,
  onSynced,
}: Props) {
  const { t, localeTag } = useMailLocale();
  const [accounts, setAccounts] = useState<MailContactCardDavAccount[]>([]);
  const [label, setLabel] = useState("");
  const [addressbookUrl, setAddressbookUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchContactCardDavAccounts(accessToken);
      setAccounts(data.accounts);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("cardDavErrLoad"),
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-section-card mail-contacts-carddav">
      <div className="mail-cal-section-head">
        <h2>{t("cardDavTitle")}</h2>
        {accounts.some((a) => a.enabled) ? (
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
            disabled={syncingAll}
            onClick={() =>
              void (async () => {
                setSyncingAll(true);
                try {
                  const r = await syncAllContactCardDavAccounts(accessToken);
                  onToast(t("cardDavSyncToast", { succeeded: r.succeeded, accounts: r.accounts, imported: r.imported, updated: r.updated, failedPart: r.failed ? t("cardDavFailedPart", { failed: r.failed }) : "" }));
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : t("cardDavSyncAllFailed"),
                  );
                  void load();
                } finally {
                  setSyncingAll(false);
                }
              })()
            }
          >
            {syncingAll ? t("cardDavSyncing") : t("cardDavSyncAll")}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">{t("cardDavHint")}</p>
      <div className="mail-cal-form-grid mail-cal-form-grid--compact">
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("cardDavLabel")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("cardDavLabelPlaceholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="mail-cal-field mail-cal-field--full">
          <span className="mail-cal-field-label">{t("cardDavUrlLabel")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("cardDavUrlPlaceholder")}
            value={addressbookUrl}
            onChange={(e) => setAddressbookUrl(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("cardDavUserLabel")}</span>
          <input
            className="mail-cal-input"
            placeholder={t("cardDavUserPlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">{t("cardDavPasswordLabel")}</span>
          <PasswordField
            className="mail-cal-input"
            placeholder={t("cardDavPasswordPlaceholder")}
            value={password}
            onChange={setPassword}
            showLabel={t("passwordToggleShow")}
            hideLabel={t("passwordToggleHide")}
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
                  !addressbookUrl.trim() ||
                  !username.trim() ||
                  !password
                ) {
                  onToast(t("cardDavErrAllFields"));
                  return;
                }
                try {
                  await createContactCardDavAccount(accessToken, {
                    label: label.trim(),
                    addressbookUrl: addressbookUrl.trim(),
                    username: username.trim(),
                    password,
                  });
                  setLabel("");
                  setAddressbookUrl("");
                  setUsername("");
                  setPassword("");
                  onToast(t("cardDavAdded"));
                  void load();
                } catch (error) {
                  onToast(
                    error instanceof Error ? error.message : t("cardDavErrAdd"),
                  );
                }
              })()
            }
          >
            {t("cardDavConnect")}
          </button>
        </div>
      </div>
      <ul className="mail-cal-feed-list">
        {accounts.map((a) => (
          <li key={a.id} className="mail-cal-feed-item">
            <div>
              <strong>{a.label}</strong>
              <div className="mail-d6-meta">
                {a.username} · {a.writeEnabled ? t("cardDavWriteOn") : t("cardDavReadOnly")}
                <br />
                {a.lastSyncedAt
                  ? t("cardDavLastSync", { when: new Date(a.lastSyncedAt).toLocaleString(localeTag) })
                  : t("cardDavNeverSync")}
                {a.lastSyncError ? t("cardDavSyncError", { error: a.lastSyncError }) : ""}
              </div>
            </div>
            <span className="mail-cal-event-actions">
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                onClick={() =>
                  void syncContactCardDavAccount(accessToken, a.id)
                    .then((r) => {
                      onToast(t("cardDavSyncRow", { imported: r.imported, updated: r.updated, removed: r.removed }));
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error
                          ? err.message
                          : t("cardDavSyncFailed"),
                      );
                      void load();
                    })
                }
              >
                {t("cardDavPull")}
              </button>
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteContactCardDavAccount(accessToken, a.id)
                    .then(() => {
                      onToast(t("cardDavAccountDeleted"));
                      void load();
                      onSynced();
                    })
                    .catch((err: unknown) => {
                      onToast(
                        err instanceof Error ? err.message : t("presetsErrDelete"),
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
          <li className="mail-cal-feed-empty">{t("cardDavEmpty")}</li>
        ) : null}
      </ul>
    </section>
  );
}
