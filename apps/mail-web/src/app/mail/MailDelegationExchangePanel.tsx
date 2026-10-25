"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addMailboxDelegate,
  deleteExchangeAccount,
  fetchMailAccountHub,
  removeMailboxDelegate,
  startExchangeOAuth,
  syncAllExchangeAccounts,
  syncExchangeAccount,
  updateMailboxAccessMode,
  type MailAccountHubPayload,
  type MailMailboxDelegatePermission,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  hub: MailAccountHubPayload;
  onHubChange: (hub: MailAccountHubPayload) => void;
};

const PERMISSION_LABEL: Record<MailMailboxDelegatePermission, string> = {
  read: "Okuma",
  send: "Okuma + gönder",
  manage: "Yönetim",
};

export function MailDelegationExchangePanel({
  accessToken,
  hub,
  onHubChange,
}: Props) {
  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegatePermission, setDelegatePermission] =
    useState<MailMailboxDelegatePermission>("send");
  const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const mailboxes = hub.mailboxDelegations ?? [];
  const canManage = hub.canManageMailboxDelegations ?? false;
  const exchange = hub.exchangeSync;

  useEffect(() => {
    if (!activeMailboxId && mailboxes.length > 0) {
      setActiveMailboxId(mailboxes[0].mailboxId);
    }
  }, [activeMailboxId, mailboxes]);

  const reloadHub = useCallback(async () => {
    const next = await fetchMailAccountHub(accessToken);
    onHubChange(next);
  }, [accessToken, onHubChange]);

  const selected =
    mailboxes.find((m) => m.mailboxId === activeMailboxId) ?? mailboxes[0];

  async function handleAccessMode(
    mode: "organization" | "delegates_only",
  ): Promise<void> {
    if (!selected) return;
    setError("");
    setStatus("");
    try {
      await updateMailboxAccessMode(accessToken, selected.mailboxId, mode);
      await reloadHub();
      setStatus(
        mode === "delegates_only"
          ? "Kutu paylaşımlı / delegasyon moduna alındı."
          : "Kutu kurum geneli erişime açıldı.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  }

  async function handleAddDelegate(): Promise<void> {
    if (!selected || !delegateEmail.trim()) return;
    setError("");
    setStatus("");
    try {
      await addMailboxDelegate(
        accessToken,
        selected.mailboxId,
        delegateEmail.trim(),
        delegatePermission,
      );
      setDelegateEmail("");
      await reloadHub();
      setStatus("Delegasyon eklendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    }
  }

  async function handleRemoveDelegate(delegateId: string): Promise<void> {
    if (!selected) return;
    setError("");
    try {
      await removeMailboxDelegate(accessToken, selected.mailboxId, delegateId);
      await reloadHub();
      setStatus("Delegasyon kaldırıldı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  async function handleExchangeConnect(): Promise<void> {
    setError("");
    setStatus("");
    try {
      const { authorizationUrl } = await startExchangeOAuth(accessToken);
      const popup = window.open(
        authorizationUrl,
        "lerta-exchange-oauth",
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
        if (data.type !== "lerta-exchange-oauth") return;
        window.removeEventListener("message", onMessage);
        if (!data.success) {
          setError(
            data.error?.trim()
              ? `Microsoft bağlantısı: ${data.error}`
              : "Microsoft oturumu tamamlanmadı.",
          );
          return;
        }
        await reloadHub();
        setStatus(
          data.emailAddress
            ? `${data.emailAddress} bağlandı; ilk senkron başlatıldı.`
            : "Exchange hesabı bağlandı ve ilk senkron başlatıldı.",
        );
      };
      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı başlatılamadı");
    }
  }

  async function handleExchangeSync(accountId: string): Promise<void> {
    setError("");
    try {
      const result = await syncExchangeAccount(accessToken, accountId);
      await reloadHub();
      setStatus(
        `Senkron: ${result.imported} yeni, ${result.updated} güncellenen mesaj.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senkron başarısız");
    }
  }

  async function handleExchangeSyncAll(): Promise<void> {
    setError("");
    try {
      const result = await syncAllExchangeAccounts(accessToken);
      await reloadHub();
      setStatus(
        `${result.accounts} hesap — ${result.imported} yeni, ${result.updated} güncellenen.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senkron başarısız");
    }
  }

  async function handleExchangeDelete(accountId: string): Promise<void> {
    setError("");
    try {
      await deleteExchangeAccount(accessToken, accountId);
      await reloadHub();
      setStatus("Exchange bağlantısı kaldırıldı.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaldırılamadı");
    }
  }

  return (
    <>
      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Paylaşımlı kutu ve delegasyon</h3>
          <p className="mail-posta-card-desc">
            Gmail delegasyonu benzeri: seçili kutuya ekip üyesi ekleyin veya
            kutuyu yalnızca delegelerle paylaşın.
          </p>
        </header>
        {mailboxes.length === 0 ? (
          <p className="mail-accounts-muted">Henüz posta kutusu yok.</p>
        ) : (
          <>
            <div className="mail-delegation-mailbox-picker">
              <label className="mail-posta-label" htmlFor="mailbox-pick">
                Posta kutusu
              </label>
              <select
                id="mailbox-pick"
                className="mail-posta-select"
                value={selected?.mailboxId ?? ""}
                onChange={(e) => setActiveMailboxId(e.target.value)}
              >
                {mailboxes.map((m) => (
                  <option key={m.mailboxId} value={m.mailboxId}>
                    {m.emailAddress}
                  </option>
                ))}
              </select>
            </div>
            {selected ? (
              <>
                <p className="mail-accounts-muted">
                  Erişim:{" "}
                  {selected.accessMode === "delegates_only"
                    ? "Yalnızca sahip ve delegeler"
                    : "Kurum (tüm mail konsol kullanıcıları)"}
                  {selected.ownerEmail
                    ? ` · Sahip: ${selected.ownerEmail}`
                    : null}
                </p>
                {canManage ? (
                  <div className="mail-delegation-mode-actions">
                    <button
                      type="button"
                      className="mail-premium-btn mail-premium-btn--ghost"
                      disabled={selected.accessMode === "organization"}
                      onClick={() => void handleAccessMode("organization")}
                    >
                      Kurum geneli
                    </button>
                    <button
                      type="button"
                      className="mail-premium-btn mail-premium-btn--ghost"
                      disabled={selected.accessMode === "delegates_only"}
                      onClick={() => void handleAccessMode("delegates_only")}
                    >
                      Paylaşımlı / delegasyon
                    </button>
                  </div>
                ) : null}
                <ul className="mail-accounts-list--premium">
                  {selected.delegates.map((d) => (
                    <li key={d.id} className="mail-accounts-card">
                      <div className="mail-accounts-card-main">
                        <span className="mail-accounts-card-email">
                          {d.emailAddress}
                        </span>
                        <span className="mail-accounts-card-name">
                          {PERMISSION_LABEL[d.permission]}
                        </span>
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          className="mail-premium-btn mail-premium-btn--ghost"
                          onClick={() => void handleRemoveDelegate(d.id)}
                        >
                          Kaldır
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <div className="mail-delegation-add">
                    <input
                      type="email"
                      className="mail-posta-input"
                      placeholder="ekip@firma.com"
                      value={delegateEmail}
                      onChange={(e) => setDelegateEmail(e.target.value)}
                    />
                    <select
                      className="mail-posta-select"
                      value={delegatePermission}
                      onChange={(e) =>
                        setDelegatePermission(
                          e.target.value as MailMailboxDelegatePermission,
                        )
                      }
                    >
                      <option value="read">Okuma</option>
                      <option value="send">Okuma + gönder</option>
                      <option value="manage">Yönetim</option>
                    </select>
                    <button
                      type="button"
                      className="mail-premium-btn"
                      onClick={() => void handleAddDelegate()}
                    >
                      Delege ekle
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Microsoft Exchange senkronu</h3>
          <p className="mail-posta-card-desc">
            Office 365 / Outlook kutunuzu Microsoft Graph ile webmail gelen
            kutusuna delta senkronu (okuma, klasör durumu, otomatik yenileme).
          </p>
        </header>
        {exchange?.configured === false ? (
          <p className="mail-accounts-muted">
            Sunucuda{" "}
            <code>MICROSOFT_GRAPH_MAIL_CLIENT_ID</code> ve ilişkili anahtarlar
            tanımlandığında bağlantı açılır.
          </p>
        ) : (
          <>
            {hub.canManageSenders ? (
              <div className="mail-delegation-mode-actions">
                <button
                  type="button"
                  className="mail-premium-btn"
                  onClick={() => void handleExchangeConnect()}
                >
                  Microsoft hesabı bağla
                </button>
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  onClick={() => void handleExchangeSyncAll()}
                >
                  Tümünü senkronize et
                </button>
              </div>
            ) : null}
            {(exchange?.accounts ?? []).length === 0 ? (
              <p className="mail-accounts-muted" role="status">
                Henüz bağlı Microsoft / Exchange hesabı yok. Bağlantı başarılı olunca
                burada e-posta adresi listelenir.
              </p>
            ) : null}
            <ul className="mail-accounts-list--premium">
              {(exchange?.accounts ?? []).map((acc) => (
                <li key={acc.id} className="mail-accounts-card">
                  <div className="mail-accounts-card-main">
                    <span className="mail-accounts-card-email">
                      {acc.emailAddress}
                    </span>
                    <span className="mail-accounts-card-name">
                      {acc.lastSyncedAt
                        ? `Son senkron: ${new Date(acc.lastSyncedAt).toLocaleString("tr-TR")}`
                        : "Henüz senkron yok"}
                      {acc.lastSyncError ? ` · Hata: ${acc.lastSyncError}` : ""}
                    </span>
                  </div>
                  {hub.canManageSenders ? (
                    <div className="mail-accounts-card-actions">
                      <button
                        type="button"
                        className="mail-premium-btn mail-premium-btn--ghost"
                        onClick={() => void handleExchangeSync(acc.id)}
                      >
                        Senkronize et
                      </button>
                      <button
                        type="button"
                        className="mail-premium-btn mail-premium-btn--ghost"
                        onClick={() => void handleExchangeDelete(acc.id)}
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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
    </>
  );
}
