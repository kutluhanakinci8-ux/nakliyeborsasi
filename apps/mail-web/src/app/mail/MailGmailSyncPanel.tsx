"use client";

import { useCallback, useState } from "react";
import {
  completeGmailOAuth,
  deleteGmailAccount,
  fetchMailAccountHub,
  startGmailOAuth,
  syncAllGmailAccounts,
  syncGmailAccount,
  type MailAccountHubPayload,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  hub: MailAccountHubPayload;
  onHubChange: (hub: MailAccountHubPayload) => void;
};

export function MailGmailSyncPanel({ accessToken, hub, onHubChange }: Props) {
  const { t, formatDateTime } = useMailLocale();
  const gmail = hub.gmailSync;
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const reloadHub = useCallback(async () => {
    const next = await fetchMailAccountHub(accessToken);
    onHubChange(next);
  }, [accessToken, onHubChange]);

  async function handleConnect(): Promise<void> {
    setError("");
    setStatus("");
    try {
      const { authorizationUrl, state } = await startGmailOAuth(accessToken);
      const popup = window.open(
        authorizationUrl,
        "lerta-gmail-oauth",
        "width=520,height=720",
      );
      if (!popup) {
        window.location.href = authorizationUrl;
        return;
      }
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as {
          type?: string;
          code?: string;
          oauthState?: string;
          error?: string;
        };
        if (data.type !== "lerta-gmail-oauth") return;
        window.removeEventListener("message", onMessage);
        void (async () => {
          if (data.error) {
            setError(data.error);
            return;
          }
          if (!data.code || !data.oauthState) {
            setError(t("gmailOAuthIncomplete"));
            return;
          }
          await completeGmailOAuth(accessToken, data.code, data.oauthState);
          await reloadHub();
          setStatus(t("gmailConnected"));
        })().catch((err) => {
          setError(err instanceof Error ? err.message : t("gmailConnectFailed"));
        });
      };
      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("gmailConnectErr"));
    }
  }

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">{t("gmailSyncTitle")}</h3>
      <p className="mail-help-topic-desc">{t("gmailSyncDesc")}</p>
      {!gmail?.configured ? (
        <p className="mail-accounts-muted">{t("gmailNotConfigured")}</p>
      ) : (
        <>
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            onClick={() => void handleConnect()}
          >
            {t("gmailConnect")}
          </button>
          {gmail.accounts.length > 0 ? (
            <ul className="mail-exchange-account-list">
              {gmail.accounts.map((account) => (
                <li key={account.id}>
                  <strong>{account.emailAddress}</strong>
                  {account.lastSyncError ? (
                    <span className="mail-accounts-status--err">
                      {account.lastSyncError}
                    </span>
                  ) : account.lastSyncedAt ? (
                    <span className="mail-accounts-muted">
                      {t("settingsLastSync", {
                        date: formatDateTime(account.lastSyncedAt),
                      })}
                    </span>
                  ) : null}
                  <div className="mail-exchange-account-actions">
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() =>
                        void syncGmailAccount(accessToken, account.id)
                          .then(() => reloadHub())
                          .then(() => setStatus(t("gmailSyncDone")))
                          .catch((e) =>
                            setError(
                              e instanceof Error ? e.message : t("gmailSyncErr"),
                            ),
                          )
                      }
                    >
                      {t("gmailSyncOne")}
                    </button>
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() =>
                        void deleteGmailAccount(accessToken, account.id)
                          .then(() => reloadHub())
                          .then(() => setStatus(t("gmailRemoved")))
                      }
                    >
                      {t("calActionRemove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {gmail.accounts.length > 0 ? (
            <button
              type="button"
              className="mail-premium-btn"
              onClick={() =>
                void syncAllGmailAccounts(accessToken)
                  .then(() => reloadHub())
                  .then(() => setStatus(t("gmailSyncAllDone")))
              }
            >
              {t("settingsSyncAll")}
            </button>
          ) : null}
        </>
      )}
      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
