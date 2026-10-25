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

type Props = {
  accessToken: string;
  hub: MailAccountHubPayload;
  onHubChange: (hub: MailAccountHubPayload) => void;
};

export function MailGmailSyncPanel({ accessToken, hub, onHubChange }: Props) {
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
            setError("Gmail OAuth tamamlanamadı.");
            return;
          }
          await completeGmailOAuth(accessToken, data.code, data.oauthState);
          await reloadHub();
          setStatus("Gmail hesabı bağlandı; ilk senkron başlatıldı.");
        })().catch((err) => {
          setError(err instanceof Error ? err.message : "Bağlantı başarısız");
        });
      };
      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı başlatılamadı");
    }
  }

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">Gmail senkronu</h3>
      <p className="mail-help-topic-desc">
        Gmail gelen kutusunu Lerta birleşik listede görün. OAuth için Google Cloud
        Gmail API ve <code>GOOGLE_GMAIL_*</code> ortam değişkenleri gerekir.
      </p>
      {!gmail?.configured ? (
        <p className="mail-accounts-muted">Sunucuda Gmail OAuth henüz yapılandırılmadı.</p>
      ) : (
        <>
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            onClick={() => void handleConnect()}
          >
            Gmail hesabı bağla
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
                      Son senkron: {new Date(account.lastSyncedAt).toLocaleString("tr-TR")}
                    </span>
                  ) : null}
                  <div className="mail-exchange-account-actions">
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() =>
                        void syncGmailAccount(accessToken, account.id)
                          .then(() => reloadHub())
                          .then(() => setStatus("Senkron tamamlandı."))
                          .catch((e) =>
                            setError(e instanceof Error ? e.message : "Senkron hatası"),
                          )
                      }
                    >
                      Senkronize et
                    </button>
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() =>
                        void deleteGmailAccount(accessToken, account.id)
                          .then(() => reloadHub())
                          .then(() => setStatus("Gmail bağlantısı kaldırıldı."))
                      }
                    >
                      Kaldır
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
                  .then(() => setStatus("Tüm Gmail hesapları senkronize edildi."))
              }
            >
              Tümünü senkronize et
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
