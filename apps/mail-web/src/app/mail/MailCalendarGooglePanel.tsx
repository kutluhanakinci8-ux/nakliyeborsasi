"use client";

import { useCallback, useEffect, useState } from "react";
import { MailCalendarOAuthSetupCard } from "./MailCalendarOAuthSetupCard";
import {
  completeCalendarGoogleOAuth,
  deleteCalendarGoogleAccount,
  fetchCalendarGoogleAccounts,
  startCalendarGoogleOAuth,
  syncAllCalendarGoogleAccounts,
  syncCalendarGoogleAccount,
  type MailCalendarGoogleAccount,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onSynced: () => void;
};

export function MailCalendarGooglePanel({
  accessToken,
  onToast,
  onSynced,
}: Props) {
  const { t } = useMailLocale();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<MailCalendarGoogleAccount[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendarGoogleAccounts(accessToken);
      setConfigured(data.configured);
      setAccounts(data.accounts);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("calGoogleLoadErr"),
      );
    }
  }, [accessToken, onToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    try {
      const { authorizationUrl, state } =
        await startCalendarGoogleOAuth(accessToken);
      const popup = window.open(
        authorizationUrl,
        "lerta-google-calendar-oauth",
        "width=520,height=720",
      );
      if (!popup) {
        window.location.assign(authorizationUrl);
        return;
      }
      const onMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as {
          type?: string;
          code?: string;
          oauthState?: string;
        };
        if (data.type !== "lerta-google-calendar-oauth") return;
        window.removeEventListener("message", onMessage);
        if (!data.code) {
          onToast(t("calGoogleOAuthIncomplete"));
          return;
        }
        await completeCalendarGoogleOAuth(
          accessToken,
          data.code,
          data.oauthState ?? state,
        );
        await load();
        onSynced();
        onToast(t("calGoogleConnected"));
      };
      window.addEventListener("message", onMessage);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : t("calGoogleConnectErr"),
      );
    }
  }

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>{t("calGoogleTitle")}</h2>
        {accounts.some((a) => a.enabled) ? (
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
            disabled={syncingAll}
            onClick={() =>
              void (async () => {
                setSyncingAll(true);
                try {
                  const r = await syncAllCalendarGoogleAccounts(accessToken);
                  onToast(
                    t("calGoogleSyncAllResult", {
                      accounts: r.accounts,
                      imported: r.imported,
                      updated: r.updated,
                      pushed: r.pushed,
                    }),
                  );
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : t("calGoogleSyncErr"),
                  );
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
      <p className="mail-cal-section-hint">{t("calGoogleHint")}</p>
      {configured === false ? (
        <MailCalendarOAuthSetupCard provider="google" />
      ) : (
        <button
          type="button"
          className="mail-cal-btn mail-cal-btn--primary mail-cal-btn--sm"
          onClick={() => void handleConnect()}
        >
          {t("calGoogleConnect")}
        </button>
      )}
      <ul className="mail-cal-account-list">
        {accounts.length === 0 ? (
          <li className="mail-cal-feed-empty">{t("calGoogleEmpty")}</li>
        ) : (
          accounts.map((acc) => (
            <li key={acc.id} className="mail-cal-account-row">
              <div>
                <strong>{acc.displayName ?? acc.emailAddress}</strong>
                <span className="mail-cal-account-meta">{acc.emailAddress}</span>
                {acc.lastSyncError ? (
                  <span className="mail-cal-account-error">{acc.lastSyncError}</span>
                ) : null}
              </div>
              <div className="mail-cal-account-actions">
                <button
                  type="button"
                  className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                  onClick={() =>
                    void syncCalendarGoogleAccount(accessToken, acc.id).then(
                      (r) => {
                        onToast(
                          t("calGoogleSyncOneResult", {
                            imported: r.imported,
                            updated: r.updated,
                            pushed: r.pushed,
                          }),
                        );
                        void load();
                        onSynced();
                      },
                    )
                  }
                >
                  {t("calActionSyncShort")}
                </button>
                <button
                  type="button"
                  className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                  onClick={() =>
                    void deleteCalendarGoogleAccount(accessToken, acc.id).then(
                      () => {
                        onToast(t("calGoogleRemoved"));
                        void load();
                      },
                    )
                  }
                >
                  {t("calActionRemove")}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
