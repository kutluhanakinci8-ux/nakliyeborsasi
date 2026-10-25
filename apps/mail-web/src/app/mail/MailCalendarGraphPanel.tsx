"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteCalendarGraphAccount,
  fetchCalendarGraphAccounts,
  startCalendarGraphOAuth,
  syncAllCalendarGraphAccounts,
  syncCalendarGraphAccount,
  type MailCalendarGraphAccount,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onToast: (message: string) => void;
  onSynced: () => void;
};

export function MailCalendarGraphPanel({
  accessToken,
  onToast,
  onSynced,
}: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<MailCalendarGraphAccount[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendarGraphAccounts(accessToken);
      setConfigured(data.configured);
      setAccounts(data.accounts);
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Graph takvim hesapları yüklenemedi.",
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    try {
      const { authorizationUrl } = await startCalendarGraphOAuth(accessToken);
      onToast("Microsoft penceresi açıldı. Onaydan sonra sonuç burada görünür.");
      const popup = window.open(
        authorizationUrl,
        "lerta-calendar-graph-oauth",
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
          success?: boolean;
          error?: string;
          emailAddress?: string;
        };
        if (data.type !== "lerta-calendar-graph-oauth") return;
        window.removeEventListener("message", onMessage);
        if (!data.success) {
          onToast(
            data.error?.trim()
              ? `Microsoft takvim: ${data.error}`
              : "Microsoft takvim oturumu tamamlanmadı.",
          );
          return;
        }
        await load();
        onSynced();
        onToast(
          data.emailAddress
            ? `${data.emailAddress} Outlook takvimi bağlandı.`
            : "Outlook takvimi bağlandı — iki yön senkron başladı.",
        );
      };
      window.addEventListener("message", onMessage);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Graph bağlantısı başlatılamadı.",
      );
    }
  }

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>Microsoft Graph takvim</h2>
        {accounts.some((a) => a.enabled) ? (
          <button
            type="button"
            className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
            disabled={syncingAll}
            onClick={() =>
              void (async () => {
                setSyncingAll(true);
                try {
                  const r = await syncAllCalendarGraphAccounts(accessToken);
                  onToast(
                    `Graph: ${r.accounts} hesap · ${r.imported} yeni, ${r.updated} güncel, ${r.pushed} yerel gönderildi.`,
                  );
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : "Graph senkron başarısız.",
                  );
                } finally {
                  setSyncingAll(false);
                }
              })()
            }
          >
            {syncingAll ? "Senkron…" : "Tümünü senkronize et"}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">
        Office 365 / Outlook takvimini webmail ile <strong>iki yön</strong>{" "}
        senkronlar (Graph OAuth). Yerel etkinlikler Outlook’a yazılır; Outlook
        etkinlikleri takvim görünümüne aktarılır.
      </p>
      {configured === false ? (
        <p className="mail-cal-feed-empty" role="note">
          Sunucuda Graph OAuth tanımlı değil (
          <code>MICROSOFT_GRAPH_MAIL_*</code> veya{" "}
          <code>MICROSOFT_GRAPH_CALENDAR_*</code>).
        </p>
      ) : (
        <button
          type="button"
          className="mail-cal-btn mail-cal-btn--primary mail-cal-btn--sm"
          onClick={() => void handleConnect()}
        >
          Outlook / Microsoft 365 bağla
        </button>
      )}
      <ul className="mail-cal-account-list">
        {accounts.length === 0 ? (
          <li className="mail-cal-feed-empty">Graph takvim hesabı yok.</li>
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
                    void syncCalendarGraphAccount(accessToken, acc.id).then(
                      (r) => {
                        onToast(
                          `Senkron: ${r.imported} yeni, ${r.updated} güncel, ${r.pushed} gönderildi.`,
                        );
                        void load();
                        onSynced();
                      },
                    )
                  }
                >
                  Senkron
                </button>
                <button
                  type="button"
                  className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                  onClick={() =>
                    void deleteCalendarGraphAccount(accessToken, acc.id).then(
                      () => {
                        onToast("Graph hesabı kaldırıldı.");
                        void load();
                      },
                    )
                  }
                >
                  Kaldır
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
