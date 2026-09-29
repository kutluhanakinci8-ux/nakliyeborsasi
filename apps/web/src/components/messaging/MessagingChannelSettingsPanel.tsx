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
  const [testMessage, setTestMessage] = useState("");

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
      const trimmedPhone = phone.trim();
      await MessagingIntegrationApiClient.updateWhatsappBridge(accessToken, {
        ...(trimmedPhone ? { whatsappNotifyE164: trimmedPhone } : {}),
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
      {bridge?.configured && bridge.notifyE164Masked ? (
        <p className="chat-channel-settings-saved-phone" role="status">
          Kayıtlı numara: <strong>{bridge.notifyE164Masked}</strong>
          <span className="chat-channel-settings-saved-hint">
            {" "}
            (değiştirmek için yeni numarayı altta yazın)
          </span>
        </p>
      ) : null}
      {bridge?.deliveryWarningTr ? (
        <p className="chat-channel-settings-delivery-warn" role="alert">
          {bridge.deliveryWarningTr}
        </p>
      ) : null}
      {bridge?.channel && bridge.channel !== "none" ? (
        <p className="chat-channel-settings-platform-hint" role="status">
          Platform kanalı: <strong>{bridge.channel}</strong>
          {bridge.twilioContentSidConfigured ? " · ContentSid tanımlı" : null}
        </p>
      ) : null}
      <label className="chat-channel-settings-field">
        <span>
          {bridge?.configured
            ? "Yeni WhatsApp numarası (E.164, isteğe bağlı)"
            : "WhatsApp numarası (E.164)"}
        </span>
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
          disabled={
            busy ||
            !kvkkChecked ||
            (!phone.trim() && !bridge?.configured)
          }
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
      {bridge?.enabled && bridge.deliveryConfigured ? (
        <button
          type="button"
          className="btn-account-secondary chat-channel-settings-test"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setTestMessage("");
            void MessagingIntegrationApiClient.sendWhatsappBridgeTest(accessToken)
              .then(() => setTestMessage("Test bildirimi gönderildi."))
              .catch((err) =>
                setTestMessage(
                  err instanceof Error ? err.message : "Test gönderilemedi",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          Test bildirimi gönder
        </button>
      ) : null}
      {testMessage ? (
        <p className="chat-channel-settings-test-result" role="status">
          {testMessage}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="chat-channel-settings-ok">Kaydedildi.</p> : null}
    </section>
  );
}
