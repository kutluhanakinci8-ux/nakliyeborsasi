"use client";

import { useEffect, useState } from "react";
import {
  MessagingIntegrationApiClient,
  type MessagingWhatsappBridgeSnapshot,
} from "../../lib/MessagingIntegrationApiClient";

type Props = {
  accessToken: string;
  visible: boolean;
};

export function MessagingChannelSettingsPanel({ accessToken, visible }: Props) {
  const [bridge, setBridge] = useState<MessagingWhatsappBridgeSnapshot | null>(
    null,
  );
  const [phone, setPhone] = useState("");
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!visible || !accessToken) {
      return;
    }
    void MessagingIntegrationApiClient.fetchSnapshot(accessToken)
      .then((payload) => {
        setBridge(payload.integration.whatsappBridge);
        setKvkkChecked(Boolean(payload.integration.whatsappBridge.kvkkAcceptedAt));
      })
      .catch(() => setError("Kanal ayarları yüklenemedi"));
  }, [visible, accessToken]);

  if (!visible) {
    return null;
  }

  async function save(enabled: boolean): Promise<void> {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await MessagingIntegrationApiClient.updateWhatsappBridge(accessToken, {
        whatsappNotifyE164: phone.trim() || null,
        enabled,
        kvkkNoticeAccepted: enabled ? kvkkChecked : undefined,
      });
      setSaved(true);
      const payload = await MessagingIntegrationApiClient.fetchSnapshot(
        accessToken,
      );
      setBridge(payload.integration.whatsappBridge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat-channel-settings module-panel" aria-label="Kanal ayarları">
      <h3 className="chat-channel-settings-title">Bildirim köprüsü (FS-12)</h3>
      <p className="chat-channel-settings-hint">
        WhatsApp yalnızca <strong>yeni mesaj</strong> uyarısı ve sohbet deep link
        gönderir; tam sohbet WA üzerinde devam etmez.
      </p>
      {bridge?.kvkkNoticeTr ? (
        <p className="chat-channel-settings-kvkk">{bridge.kvkkNoticeTr}</p>
      ) : null}
      <label className="chat-channel-settings-field">
        <span>WhatsApp numarası (E.164)</span>
        <input
          className="input-light"
          type="tel"
          placeholder="+905xxxxxxxxx"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label className="chat-channel-settings-check">
        <input
          type="checkbox"
          checked={kvkkChecked}
          onChange={(event) => setKvkkChecked(event.target.checked)}
        />
        KVKK bilgilendirme metnini okudum ve onaylıyorum
      </label>
      <div className="chat-channel-settings-actions">
        <button
          type="button"
          className="btn-accent"
          disabled={busy || !kvkkChecked || !phone.trim()}
          onClick={() => void save(true)}
        >
          Etkinleştir
        </button>
        <button
          type="button"
          className="btn-account-secondary"
          disabled={busy}
          onClick={() => void save(false)}
        >
          Kapat
        </button>
      </div>
      {bridge?.enabled ? (
        <p className="chat-channel-settings-status">Durum: etkin</p>
      ) : (
        <p className="chat-channel-settings-status">Durum: kapalı</p>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="chat-channel-settings-ok">Kaydedildi.</p> : null}
    </section>
  );
}
