"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDeliverabilityHub,
  type MailDeliverabilityHub,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  /** EK-P7 hub deep link — DMARC aggregate bölümüne odaklan. */
  highlightDmarc?: boolean;
  /** EK-P10 hub deep link — engagement + webhook analitik. */
  highlightEngagement?: boolean;
};

const PERIOD_OPTIONS = [7, 30, 90] as const;

export function MailDeliverabilityPanel({
  accessToken,
  highlightDmarc = false,
  highlightEngagement = false,
}: Props) {
  const [days, setDays] = useState<number>(
    highlightDmarc ? 90 : highlightEngagement ? 30 : 30,
  );
  const [hub, setHub] = useState<MailDeliverabilityHub | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await fetchDeliverabilityHub(accessToken, days);
      setHub(payload.hub);
    } catch {
      setError("Teslimat özeti yüklenemedi.");
      setHub(null);
    }
  }, [accessToken, days]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightDmarc || !hub) {
      return;
    }
    const el = document.getElementById("mail-dmarc-aggregate");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightDmarc, hub]);

  useEffect(() => {
    if (!highlightEngagement || !hub) {
      return;
    }
    const el = document.getElementById("mail-engagement-analytics");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightEngagement, hub]);

  if (error) {
    return <p className="login-error">{error}</p>;
  }
  if (!hub) {
    return <p>Yükleniyor…</p>;
  }

  const engagement = hub.engagement ?? hub.engagement30d;
  const webhooks = hub.webhookAnalytics;

  return (
    <div className="mail-deliverability-panel">
      {highlightDmarc ? (
        <p className="mail-parity-assist-banner" role="status">
          DMARC aggregate: SPF/DKIM geçiş oranları ve rapor satırları bu bölümde.
          DNS kayıtları yukarıda; dönem seçerek trendi inceleyin.
        </p>
      ) : null}
      {highlightEngagement ? (
        <p className="mail-parity-assist-banner" role="status">
          Engagement: outbox açılma/tıklama/bounce oranları. Webhook uç noktaları
          ile <code>message.opened</code>, <code>message.clicked</code> ve{" "}
          <code>message.bounced</code> olaylarını harici sisteme aktarabilirsiniz.
        </p>
      ) : null}
      <p className="mail-settings-lead">
        Kurumsal gönderim itibarı: DNS, engagement (açılma/tıklama/bounce), DMARC
        aggregate ve suppression — yalnızca bu organizasyonun outbox kayıtları.
      </p>
      <div className="mail-deliverability-period">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={
              days === option
                ? "mail-deliverability-period-btn is-active"
                : "mail-deliverability-period-btn"
            }
            onClick={() => setDays(option)}
          >
            {option} gün
          </button>
        ))}
      </div>
      <p>
        Skor: <strong>{hub.score}/100</strong>
        <span className="mail-deliverability-muted">
          {" "}
          (son {hub.periodDays ?? days} gün)
        </span>
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
      <h4
        id="mail-engagement-analytics"
        className={
          highlightEngagement
            ? "mail-deliverability-subhead mail-deliverability-subhead--focus"
            : "mail-deliverability-subhead"
        }
      >
        Engagement
      </h4>
      <ul>
        <li>Gönderim: {engagement?.sentInPeriod ?? "—"}</li>
        <li>Bounce: {engagement?.bounceRatePercent ?? "—"}%</li>
        <li>Açılma: {engagement?.openRatePercent ?? "—"}%</li>
        <li>Tıklama: {engagement?.clickRatePercent ?? "—"}%</li>
        <li>Suppression: {hub.suppressionCount}</li>
      </ul>
      {engagement?.bounceByClass &&
      Object.keys(engagement.bounceByClass).length > 0 ? (
        <ul className="mail-deliverability-bounce-class">
          {Object.entries(engagement.bounceByClass).map(([cls, count]) => (
            <li key={cls}>
              Bounce ({cls}): {count}
            </li>
          ))}
        </ul>
      ) : null}
      {webhooks ? (
        <>
          <h4
            id="mail-webhook-analytics"
            className="mail-deliverability-subhead"
          >
            Webhook analitik
          </h4>
          <ul>
            <li>
              Public API: {webhooks.publicApiAllowed ? "açık" : "plan gerekli"}
            </li>
            <li>
              Uç nokta: {webhooks.enabledEndpointCount} aktif /{" "}
              {webhooks.endpointCount} toplam
            </li>
            <li>
              Abone olaylar:{" "}
              {webhooks.subscribedEvents.length > 0
                ? webhooks.subscribedEvents.join(", ")
                : "—"}
            </li>
            <li>
              Engagement olayları:{" "}
              {webhooks.engagementWebhookEvents.join(", ")}
            </li>
            <li>
              Yapılandırma API: <code>{webhooks.configureApiPath}</code>
            </li>
          </ul>
        </>
      ) : null}
      <h4
        id="mail-dmarc-aggregate"
        className={
          highlightDmarc
            ? "mail-deliverability-subhead mail-deliverability-subhead--focus"
            : "mail-deliverability-subhead"
        }
      >
        DMARC aggregate
      </h4>
      <ul>
        <li>Rapor satırı ({hub.periodDays ?? days}g): {hub.dmarc?.reportRows ?? 0}</li>
        <li>İleti sayısı: {hub.dmarc?.messageCount ?? 0}</li>
        <li>DKIM pass: {hub.dmarc?.dkimPassRatePercent ?? "—"}%</li>
        <li>SPF pass: {hub.dmarc?.spfPassRatePercent ?? "—"}%</li>
        <li>Toplam rapor (tüm dönemler): {hub.dmarcReports90d}</li>
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
