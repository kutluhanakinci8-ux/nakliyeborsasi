"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMailAccountHub,
  setDefaultMailSender,
  type MailAccountHubPayload,
} from "@/lib/mailApi";
import { resolveMailConsoleUrl } from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailAccountsSettingsPanel({ accessToken }: Props) {
  const [hub, setHub] = useState<MailAccountHubPayload | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchMailAccountHub(accessToken);
      setHub(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleDefault(senderId: string): Promise<void> {
    setStatus("");
    try {
      const result = await setDefaultMailSender(accessToken, senderId);
      setHub((prev) =>
        prev ? { ...prev, senders: result.senders } : prev,
      );
      setStatus("Varsayılan gönderen güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  }

  if (loading) {
    return <p className="mail-settings-muted">Hesaplar yükleniyor…</p>;
  }
  if (error && !hub) {
    return <p className="mail-settings-error">{error}</p>;
  }
  if (!hub) {
    return null;
  }

  const consoleUrl = resolveMailConsoleUrl();

  return (
    <div className="mail-accounts-settings">
      <p className="mail-settings-lead">
        Kurumsal kutu:{" "}
        <strong>{hub.primaryAddress ?? "Henüz atanmadı"}</strong>
        {hub.unreadCount > 0 ? ` · ${hub.unreadCount} okunmamış` : null}
      </p>
      {hub.branding?.emailBrandTitle ? (
        <p className="mail-settings-muted">
          Marka başlığı: {hub.branding.emailBrandTitle}
        </p>
      ) : null}

      <h3 className="mail-settings-subhead">Gönderen kimlikleri</h3>
      <ul className="mail-accounts-list">
        {hub.senders.map((sender) => (
          <li key={sender.id} className="mail-accounts-row">
            <div>
              <strong>{sender.fromAddress}</strong>
              {sender.isDefault ? (
                <span className="mail-accounts-badge">Varsayılan</span>
              ) : null}
              {sender.displayName ? (
                <div className="mail-settings-muted">{sender.displayName}</div>
              ) : null}
            </div>
            {hub.canManageSenders && !sender.isDefault ? (
              <button
                type="button"
                className="mail-settings-btn-secondary"
                onClick={() => void handleDefault(sender.id)}
              >
                Varsayılan yap
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <h3 className="mail-settings-subhead">Takma adlar (alias)</h3>
      {hub.aliases.length === 0 ? (
        <p className="mail-settings-muted">Kayıtlı alias yok.</p>
      ) : (
        <ul className="mail-accounts-list">
          {hub.aliases.map((alias) => (
            <li key={alias.id} className="mail-accounts-row">
              <span>{alias.aliasEmail}</span>
              <span className="mail-settings-muted">
                → {alias.targets[0]?.emailAddress ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hub.canManageSenders ? (
        <p className="mail-settings-muted">
          Yeni alias veya domain için{" "}
          <a href={consoleUrl} target="_blank" rel="noreferrer">
            yönetim konsolu
          </a>
          .
        </p>
      ) : null}
      {status ? <p className="mail-settings-ok">{status}</p> : null}
      {error ? <p className="mail-settings-error">{error}</p> : null}
    </div>
  );
}
