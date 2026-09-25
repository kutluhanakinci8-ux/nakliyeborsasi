"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  createMailApiKey,
  createMailWebhook,
  fetchMailIntegration,
  isPlatformOperator,
  revokeMailApiKey,
  type MailIntegrationSnapshot,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function IntegrationPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [integration, setIntegration] = useState<MailIntegrationSnapshot | null>(
    null,
  );
  const [keyLabel, setKeyLabel] = useState("Üretim");
  const [newKey, setNewKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("message.sent,message.failed");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function reload() {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailIntegration(accessToken);
    setIntegration(data.integration);
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      try {
        await reload();
      } catch {
        setError("Entegrasyon bilgisi yüklenemedi.");
      }
    })();
  }, [accessToken, router]);

  async function onCreateKey(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setError("");
    try {
      const data = await createMailApiKey(accessToken, keyLabel);
      setNewKey(data.apiKey.apiKey);
      await reload();
      setMessage("API anahtarı oluşturuldu — bir kez kopyalayın.");
    } catch {
      setError("Anahtar oluşturulamadı (Enterprise plan gerekli).");
    }
  }

  async function onCreateWebhook(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setError("");
    const events = webhookEvents
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean) as MailIntegrationSnapshot["availableWebhookEvents"];
    try {
      const data = await createMailWebhook(accessToken, {
        url: webhookUrl.trim(),
        events,
      });
      setNewWebhookSecret(data.signingSecret);
      await reload();
      setMessage("Webhook kaydedildi.");
    } catch {
      setError("Webhook eklenemedi (https URL ve geçerli olaylar).");
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>API ve webhook</h1>
      {integration && !integration.allowed ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p>{integration.detailTr}</p>
          <Link href="/upgrade">Plan yükseltme</Link>
        </div>
      ) : null}
      {integration?.allowed ? (
        <>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            Public API: <code>{integration.publicApiBasePath}</code>
          </p>
          {newKey ? (
            <div className="card" style={{ marginTop: 16 }}>
              <strong>Yeni API anahtarı (bir kez):</strong>
              <pre style={{ wordBreak: "break-all", fontSize: 12 }}>{newKey}</pre>
            </div>
          ) : null}
          {newWebhookSecret ? (
            <div className="card" style={{ marginTop: 16 }}>
              <strong>Webhook imza secret (bir kez):</strong>
              <pre style={{ wordBreak: "break-all", fontSize: 12 }}>
                {newWebhookSecret}
              </pre>
            </div>
          ) : null}
          <form className="card" style={{ marginTop: 16 }} onSubmit={onCreateKey}>
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>API anahtarı</h2>
            <input
              className="input"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <button className="btn" type="submit">Anahtar oluştur</button>
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: "0.85rem" }}>
              {integration.apiKeys.map((key) => (
                <li key={key.id}>
                  {key.label} · <code>{key.keyPrefix}…</code>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginLeft: 8, padding: "2px 8px", fontSize: 12 }}
                    onClick={() =>
                      void revokeMailApiKey(accessToken!, key.id).then(reload)
                    }
                  >
                    İptal
                  </button>
                </li>
              ))}
            </ul>
          </form>
          <form
            className="card"
            style={{ marginTop: 16 }}
            onSubmit={onCreateWebhook}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Webhook</h2>
            <input
              className="input"
              placeholder="https://…"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <input
              className="input"
              value={webhookEvents}
              onChange={(e) => setWebhookEvents(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
              Olaylar: {integration.availableWebhookEvents.join(", ")}
            </p>
            <button className="btn" type="submit">Webhook ekle</button>
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: "0.85rem" }}>
              {integration.webhooks.map((hook) => (
                <li key={hook.id}>
                  <code>{hook.url}</code> · {hook.events.join(", ")}
                </li>
              ))}
            </ul>
          </form>
        </>
      ) : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--success)" }}>{message}</p> : null}
      <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
        <code>docs/MAIL_PUBLIC_API_WEBHOOKS.md</code>
      </p>
    </ConsoleShell>
  );
}
