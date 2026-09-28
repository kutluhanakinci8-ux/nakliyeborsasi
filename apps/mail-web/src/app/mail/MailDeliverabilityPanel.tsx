"use client";

import { useEffect, useState } from "react";
import {
  fetchDeliverabilityHub,
  type MailDeliverabilityHub,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailDeliverabilityPanel({ accessToken }: Props) {
  const [hub, setHub] = useState<MailDeliverabilityHub | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchDeliverabilityHub(accessToken)
      .then((payload) => setHub(payload.hub))
      .catch(() => setError("Teslimat özeti yüklenemedi."));
  }, [accessToken]);

  if (error) {
    return <p className="login-error">{error}</p>;
  }
  if (!hub) {
    return <p>Yükleniyor…</p>;
  }

  return (
    <div className="mail-deliverability-panel">
      <p className="mail-settings-lead">
        SPF, DKIM, bounce ve suppression özeti (son 30 gün gönderim istatistikleri).
      </p>
      <p>
        Skor: <strong>{hub.score}/100</strong>
      </p>
      {hub.dns ? (
        <ul className="mail-deliverability-dns">
          <li>Domain: {hub.dns.domain ?? "—"}</li>
          <li>MX: {hub.dns.mx ? "✓" : "✗"}</li>
          <li>SPF: {hub.dns.spf ? "✓" : "✗"}</li>
          <li>DKIM: {hub.dns.dkim ? "✓" : "✗"}</li>
        </ul>
      ) : (
        <p>Özel domain bağlı değil.</p>
      )}
      <ul>
        <li>Gönderim (30g): {hub.engagement30d.sentInPeriod}</li>
        <li>Bounce: {hub.engagement30d.bounceRatePercent ?? "—"}%</li>
        <li>Açılma: {hub.engagement30d.openRatePercent ?? "—"}%</li>
        <li>Suppression: {hub.suppressionCount}</li>
        <li>DMARC rapor (90g): {hub.dmarcReports90d}</li>
      </ul>
      {hub.hintsTr.length > 0 ? (
        <ul className="mail-deliverability-hints">
          {hub.hintsTr.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
