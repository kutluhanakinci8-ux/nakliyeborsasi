"use client";

import { useEffect, useState } from "react";
import { MessagingIntegrationApiClient } from "../../lib/MessagingIntegrationApiClient";

type Props = {
  accessToken: string;
  isCompanyOwner: boolean;
};

export function MessagingSlackBridgeCard({
  accessToken,
  isCompanyOwner,
}: Props) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isCompanyOwner || !accessToken) {
      return;
    }
    void MessagingIntegrationApiClient.fetchSnapshot(accessToken)
      .then((payload) => {
        const slack = payload.integration.slackBridge;
        setEnabled(slack.enabled);
        setConfigured(slack.configured);
      })
      .catch(() => setError("Slack köprü durumu alınamadı"));
  }, [accessToken, isCompanyOwner]);

  if (!isCompanyOwner) {
    return null;
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await MessagingIntegrationApiClient.updateSlackBridge(accessToken, {
        enabled,
        slackIncomingWebhookUrl: webhookUrl.trim() || null,
      });
      setSaved(true);
      setConfigured(Boolean(webhookUrl.trim()) || configured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="messaging-slack-bridge-card" aria-label="Slack köprüsü">
      <h3 className="messaging-slack-bridge-card-title">Slack incoming webhook</h3>
      <p className="module-hint messaging-slack-bridge-card-lead">
        Firma sohbetinde yeni mesaj özeti Slack kanalına gider (isteğe bağlı).
      </p>
      {configured ? (
        <p className="module-hint" role="status">
          Webhook tanımlı{enabled ? " · köprü açık" : " · kapalı"}.
        </p>
      ) : null}
      {error ? <p className="error banner error--light">{error}</p> : null}
      <label className="messaging-slack-bridge-field">
        <span>Webhook URL</span>
        <input
          className="input-light"
          type="url"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(event) => setWebhookUrl(event.target.value)}
        />
      </label>
      <label className="messaging-slack-bridge-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Slack köprüsünü etkinleştir
      </label>
      <button
        type="button"
        className="messaging-slack-bridge-save"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? "Kaydediliyor…" : "Slack ayarlarını kaydet"}
      </button>
      {saved ? (
        <p className="module-hint" role="status">Kaydedildi.</p>
      ) : null}
    </section>
  );
}
