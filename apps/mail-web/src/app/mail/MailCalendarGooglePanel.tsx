"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteCalendarGoogleAccount,
  fetchCalendarGoogleAccounts,
  startCalendarGoogleOAuth,
  syncAllCalendarGoogleAccounts,
  syncCalendarGoogleAccount,
  type MailCalendarGoogleAccount,
} from "@/lib/mailApi";

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
        error instanceof Error
          ? error.message
          : "Google takvim hesapları yüklenemedi.",
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    try {
      const { authorizationUrl } = await startCalendarGoogleOAuth(accessToken);
      onToast("Google penceresi açıldı. Onaydan sonra sonuç burada görünür.");
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
          success?: boolean;
          error?: string;
          emailAddress?: string;
        };
        if (data.type !== "lerta-google-calendar-oauth") return;
        window.removeEventListener("message", onMessage);
        if (!data.success) {
          onToast(
            data.error?.trim()
              ? `Google takvim: ${data.error}`
              : "Google takvim oturumu tamamlanmadı.",
          );
          return;
        }
        await load();
        onSynced();
        onToast(
          data.emailAddress
            ? `${data.emailAddress} Google takvimi bağlandı.`
            : "Google Takvim bağlandı — iki yön senkron başladı.",
        );
      };
      window.addEventListener("message", onMessage);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Google bağlantısı başlatılamadı.",
      );
    }
  }

  return (
    <section className="mail-cal-section-card">
      <div className="mail-cal-section-head">
        <h2>Google Takvim</h2>
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
                    `Google: ${r.accounts} hesap · ${r.imported} yeni, ${r.updated} güncel, ${r.pushed} yerel gönderildi.`,
                  );
                  void load();
                  onSynced();
                } catch (error) {
                  onToast(
                    error instanceof Error
                      ? error.message
                      : "Google senkron başarısız.",
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
        Google Calendar ile webmail takvimini <strong>iki yön</strong> senkronlar
        (OAuth). Yerel etkinlikler Google’a yazılır; Google etkinlikleri takvim
        görünümüne aktarılır.
      </p>
      {configured === false ? (
        <p className="mail-cal-feed-empty" role="note">
          Sunucuda Google OAuth tanımlı değil (
          <code>GOOGLE_CALENDAR_CLIENT_ID</code> /{" "}
          <code>GOOGLE_CALENDAR_CLIENT_SECRET</code>).
        </p>
      ) : (
        <button
          type="button"
          className="mail-cal-btn mail-cal-btn--primary mail-cal-btn--sm"
          onClick={() => void handleConnect()}
        >
          Google hesabı bağla
        </button>
      )}
      <ul className="mail-cal-account-list">
        {accounts.length === 0 ? (
          <li className="mail-cal-feed-empty">Google takvim hesabı yok.</li>
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
                    void deleteCalendarGoogleAccount(accessToken, acc.id).then(
                      () => {
                        onToast("Google hesabı kaldırıldı.");
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
