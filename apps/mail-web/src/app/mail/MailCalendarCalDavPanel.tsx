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
        error instanceof Error ? error.message : "CalDAV hesapları yüklenemedi.",
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-feeds">
      <h2>CalDAV hesabı</h2>
      <p className="mail-d6-hint">
        Nextcloud / Baikal gibi sunucularda takvim koleksiyon URL’si (HTTPS) ve
        kullanıcı adı/şifre. Okuma REPORT ile; yerel etkinlikleri hesaba{" "}
        <strong>CalDAV’a yaz</strong> ile gönderin.
      </p>
      <div className="mail-d6-form">
        <input
          placeholder="Ad (ör. Nextcloud iş)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          placeholder="https://…/dav/calendars/kullanici/kişisel/"
          value={calendarUrl}
          onChange={(e) => setCalendarUrl(e.target.value)}
        />
        <input
          placeholder="Kullanıcı adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            void (async () => {
              if (
                !label.trim() ||
                !calendarUrl.trim() ||
                !username.trim() ||
                !password
              ) {
                onToast("Tüm alanlar gerekli.");
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
                onToast("CalDAV hesabı eklendi.");
                void load();
              } catch (error) {
                onToast(
                  error instanceof Error ? error.message : "Eklenemedi.",
                );
              }
            })()
          }
        >
          Bağla
        </button>
      </div>
      {accounts.some((a) => a.enabled) ? (
        <button
          type="button"
          className="mail-d6-sync-all"
          disabled={syncingAll}
          onClick={() =>
            void (async () => {
              setSyncingAll(true);
              try {
                const r = await syncAllCalendarCalDavAccounts(accessToken);
                onToast(
                  `CalDAV: ${r.succeeded}/${r.accounts} hesap · ${r.imported} yeni, ${r.updated} güncel${r.failed ? ` · ${r.failed} hata` : ""}.`,
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
          {syncingAll ? "Senkronize ediliyor…" : "Tüm CalDAV hesaplarını çek"}
        </button>
      ) : null}
      <ul className="mail-d6-list">
        {accounts.map((a) => (
          <li key={a.id}>
            <div>
              <strong>{a.label}</strong>
              <div className="mail-d6-meta">
                {a.username} · {a.writeEnabled ? "yazma açık" : "yalnızca okuma"}
                <br />
                {a.lastSyncedAt
                  ? `Son senkron: ${new Date(a.lastSyncedAt).toLocaleString("tr-TR")}`
                  : "Henüz senkron yok"}
                {a.lastSyncError ? ` · Hata: ${a.lastSyncError}` : ""}
              </div>
            </div>
            <span className="mail-d6-actions">
              <button
                type="button"
                onClick={() =>
                  void syncCalendarCalDavAccount(accessToken, a.id)
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
                Çek
              </button>
              <button
                type="button"
                className="mail-d6-danger"
                onClick={() =>
                  void deleteCalendarCalDavAccount(accessToken, a.id)
                    .then(() => {
                      onToast("Hesap silindi.");
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
        {accounts.length === 0 ? (
          <li className="mail-d6-empty">CalDAV hesabı yok.</li>
        ) : null}
      </ul>
    </section>
  );
}
