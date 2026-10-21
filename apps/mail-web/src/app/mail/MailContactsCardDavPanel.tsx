"use client";

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
        error instanceof Error ? error.message : "CardDAV hesapları yüklenemedi.",
      );
    }
  }, [accessToken, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-cal-section-card mail-contacts-carddav">
      <div className="mail-cal-section-head">
        <h2>CardDAV adres defteri</h2>
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
                  onToast(
                    `CardDAV: ${r.succeeded}/${r.accounts} hesap · ${r.imported} yeni, ${r.updated} güncel${r.failed ? ` · ${r.failed} hata` : ""}.`,
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
            {syncingAll ? "Senkronize ediliyor…" : "Tümünü çek"}
          </button>
        ) : null}
      </div>
      <p className="mail-cal-section-hint">
        Nextcloud{" "}
        <code>…/addressbooks/kullanici/kişisel/</code> gibi HTTPS koleksiyon
        URL’si. Kişi kartlarından <strong>CardDAV</strong> ile yerel kayıt
        sunucuya gönderilir.
      </p>
      <div className="mail-cal-form-grid mail-cal-form-grid--compact">
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">Ad</span>
          <input
            className="mail-cal-input"
            placeholder="ör. Nextcloud iş"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="mail-cal-field mail-cal-field--full">
          <span className="mail-cal-field-label">Adres defteri URL</span>
          <input
            className="mail-cal-input"
            placeholder="https://…/addressbooks/…/"
            value={addressbookUrl}
            onChange={(e) => setAddressbookUrl(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">Kullanıcı</span>
          <input
            className="mail-cal-input"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="mail-cal-field">
          <span className="mail-cal-field-label">Şifre</span>
          <input
            className="mail-cal-input"
            type="password"
            placeholder="Şifre"
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
                  !addressbookUrl.trim() ||
                  !username.trim() ||
                  !password
                ) {
                  onToast("Tüm alanlar gerekli.");
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
                  onToast("CardDAV hesabı eklendi.");
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
      </div>
      <ul className="mail-cal-feed-list">
        {accounts.map((a) => (
          <li key={a.id} className="mail-cal-feed-item">
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
            <span className="mail-cal-event-actions">
              <button
                type="button"
                className="mail-cal-btn mail-cal-btn--ghost mail-cal-btn--sm"
                onClick={() =>
                  void syncContactCardDavAccount(accessToken, a.id)
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
                className="mail-cal-btn mail-cal-btn--danger mail-cal-btn--sm"
                onClick={() =>
                  void deleteContactCardDavAccount(accessToken, a.id)
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
          <li className="mail-cal-feed-empty">CardDAV hesabı yok.</li>
        ) : null}
      </ul>
    </section>
  );
}
