"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDeliverabilityHub,
  type MailDeliverabilityHub,
} from "@/lib/mailApi";
import { MailDeliverabilityWizard } from "./MailDeliverabilityWizard";
import { MailDeliverabilityEngagementMap } from "./MailDeliverabilityEngagementMap";

type Props = {
  accessToken: string;
  highlightDmarc?: boolean;
  highlightEngagement?: boolean;
};

const PERIOD_OPTIONS = [7, 30, 90] as const;

function StatTile({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="mail-deliverability-stat">
      <span className="mail-deliverability-stat-label">{label}</span>
      <span className="mail-deliverability-stat-value">
        {value}
        {suffix}
      </span>
    </div>
  );
}

function DnsBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={
        ok
          ? "mail-deliverability-dns-badge is-ok"
          : "mail-deliverability-dns-badge is-bad"
      }
    >
      {label}
      <span className="mail-deliverability-dns-badge-icon" aria-hidden="true">
        {ok ? "✓" : "✗"}
      </span>
    </span>
  );
}

function scoreTone(score: number): "good" | "mid" | "low" {
  if (score >= 80) {
    return "good";
  }
  if (score >= 50) {
    return "mid";
  }
  return "low";
}

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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const payload = await fetchDeliverabilityHub(accessToken, days);
      setHub(payload.hub);
    } catch {
      setError("Teslimat özeti yüklenemedi.");
      setHub(null);
    } finally {
      setLoading(false);
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

  if (loading && !hub) {
    return (
      <div className="mail-deliverability-panel mail-deliverability-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  if (error && !hub) {
    return (
      <p className="mail-accounts-status mail-accounts-status--err" role="alert">
        {error}
      </p>
    );
  }

  if (!hub) {
    return null;
  }

  const engagement = hub.engagement ?? hub.engagement30d;
  const webhooks = hub.webhookAnalytics;
  const periodDays = hub.periodDays ?? days;
  const tone = scoreTone(hub.score);

  return (
    <div className="mail-deliverability-panel mail-deliverability-panel--premium">
      {highlightDmarc ? (
        <div className="mail-notify-info mail-notify-info--pwa" role="status">
          <span className="mail-notify-info-icon" aria-hidden="true">📊</span>
          <div>
            <p className="mail-notify-info-title">DMARC aggregate odak</p>
            <p className="mail-notify-info-body">
              SPF/DKIM geçiş oranları ve rapor satırları altta. DNS kayıtları
              sihirbazda; dönem seçerek trendi inceleyin.
            </p>
          </div>
        </div>
      ) : null}
      {highlightEngagement ? (
        <div className="mail-notify-info mail-notify-info--pwa" role="status">
          <span className="mail-notify-info-icon" aria-hidden="true">📈</span>
          <div>
            <p className="mail-notify-info-title">Engagement odak</p>
            <p className="mail-notify-info-body">
              Outbox açılma/tıklama/bounce oranları. Webhook ile{" "}
              <code>message.opened</code>, <code>message.clicked</code> ve{" "}
              <code>message.bounced</code> olaylarını harici sisteme aktarın.
            </p>
          </div>
        </div>
      ) : null}

      <p className="mail-posta-intro">
        Kurumsal gönderim itibarı: DNS, engagement (açılma/tıklama/bounce), DMARC
        aggregate ve suppression — yalnızca bu organizasyonun outbox kayıtları.
      </p>

      <section className="mail-posta-card mail-deliverability-score-card">
        <header className="mail-deliverability-score-head">
          <div
            className={`mail-deliverability-score-ring mail-deliverability-score-ring--${tone}`}
            aria-hidden="true"
          >
            <span className="mail-deliverability-score-number">{hub.score}</span>
            <span className="mail-deliverability-score-max">/100</span>
          </div>
          <div className="mail-deliverability-score-meta">
            <h3 className="mail-posta-card-title">Teslimat skoru</h3>
            <p className="mail-posta-card-desc">
              Son {periodDays} günlük özet — DNS ve engagement etkiler.
            </p>
            <div
              className="mail-posta-chips mail-posta-chips--equal mail-deliverability-period-chips"
              role="group"
              aria-label="Dönem seçimi"
            >
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    days === option
                      ? "mail-posta-chip is-active"
                      : "mail-posta-chip"
                  }
                  aria-pressed={days === option}
                  onClick={() => setDays(option)}
                >
                  <span className="mail-posta-chip-label">{option} gün</span>
                </button>
              ))}
            </div>
          </div>
        </header>
        {hub.dns ? (
          <div className="mail-deliverability-dns-row">
            <span className="mail-deliverability-domain">
              {hub.dns.domain ?? "—"}
            </span>
            <DnsBadge label="MX" ok={Boolean(hub.dns.mx)} />
            <DnsBadge label="SPF" ok={Boolean(hub.dns.spf)} />
            <DnsBadge label="DKIM" ok={Boolean(hub.dns.dkim)} />
          </div>
        ) : (
          <p className="mail-deliverability-no-domain" role="note">
            Özel domain bağlı değil — gönderim itibarı sınırlı olabilir.
          </p>
        )}
      </section>

      <MailDeliverabilityWizard hub={hub} />

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Alan adı itibarı</h3>
          <p className="mail-posta-card-desc">
            Google Postmaster ve DMARC aggregate ile gönderen itibarını izleyin.
          </p>
        </header>
        <ul className="mail-deliverability-links">
          <li>
            <a
              href="https://postmaster.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mail-deliverability-link"
            >
              Google Postmaster Tools →
            </a>
          </li>
          <li>DMARC aggregate: konsol → teslimat / DMARC paneli (rua raporları)</li>
          <li>PTR + SPF + DKIM: DNS sihirbazındaki adımlar tamamlanmalı</li>
          <li>
            BIMI: DMARC <code>p=quarantine</code> veya <code>p=reject</code> sonrası
            inbox logosu için önerilir
          </li>
        </ul>
      </section>

      <section
        id="mail-engagement-analytics"
        className={
          highlightEngagement
            ? "mail-posta-card mail-deliverability-focus-card"
            : "mail-posta-card"
        }
      >
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Engagement</h3>
          <p className="mail-posta-card-desc">
            Outbox gönderim, bounce, açılma ve tıklama ({periodDays} gün).
          </p>
        </header>
        <div className="mail-deliverability-stat-grid">
          <StatTile label="Gönderim" value={engagement?.sentInPeriod ?? "—"} />
          <StatTile
            label="Bounce"
            value={engagement?.bounceRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label="Açılma"
            value={engagement?.openRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label="Tıklama"
            value={engagement?.clickRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile label="Suppression" value={hub.suppressionCount} />
        </div>
        {engagement?.bounceByClass &&
        Object.keys(engagement.bounceByClass).length > 0 ? (
          <ul className="mail-deliverability-bounce-class">
            {Object.entries(engagement.bounceByClass).map(([cls, count]) => (
              <li key={cls}>
                <span className="mail-deliverability-bounce-label">Bounce ({cls})</span>
                <span className="mail-deliverability-bounce-count">{count}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {hub.bounceIntelligence ? (
          <div className="mail-deliverability-bounce-intel">
            <p className="compose-attach-hint">{hub.bounceIntelligence.reputationHintTr}</p>
            <div className="mail-deliverability-stat-grid mail-deliverability-stat-grid--3">
              <StatTile label="Hard bounce" value={hub.bounceIntelligence.hardBounces} />
              <StatTile label="Soft bounce" value={hub.bounceIntelligence.softBounces} />
            </div>
            {hub.bounceIntelligence.topBounceDomains.length > 0 ? (
              <ul className="mail-deliverability-bounce-class">
                {hub.bounceIntelligence.topBounceDomains.map((row) => (
                  <li key={row.domain}>
                    <span className="mail-deliverability-bounce-label">{row.domain}</span>
                    <span className="mail-deliverability-bounce-count">{row.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {engagement?.dailyOpenClick?.length ||
        engagement?.providerBreakdown?.length ? (
          <MailDeliverabilityEngagementMap
            dailyOpenClick={engagement.dailyOpenClick ?? []}
            providerBreakdown={engagement.providerBreakdown ?? []}
          />
        ) : null}
      </section>

      {webhooks ? (
        <section id="mail-webhook-analytics" className="mail-posta-card">
          <header className="mail-posta-card-head mail-deliverability-card-head">
            <div>
              <h3 className="mail-posta-card-title">Webhook analitik</h3>
              <p className="mail-posta-card-desc">
                Harici sistemlere engagement olayları aktarımı.
              </p>
            </div>
            <span
              className={
                webhooks.publicApiAllowed
                  ? "mail-deliverability-wizard-pill"
                  : "mail-deliverability-step-badge"
              }
            >
              {webhooks.publicApiAllowed ? "Public API açık" : "Plan gerekli"}
            </span>
          </header>
          <div className="mail-deliverability-stat-grid mail-deliverability-stat-grid--3">
            <StatTile
              label="Uç nokta"
              value={`${webhooks.enabledEndpointCount} / ${webhooks.endpointCount}`}
            />
            <StatTile
              label="Abone olay"
              value={
                webhooks.subscribedEvents.length > 0
                  ? webhooks.subscribedEvents.length
                  : "—"
              }
            />
            <StatTile label="Aktif" value={webhooks.enabledEndpointCount} />
          </div>
          <p className="mail-deliverability-events">
            <span className="mail-deliverability-events-label">Olaylar</span>
            {webhooks.engagementWebhookEvents.join(", ")}
          </p>
          <p className="mail-deliverability-api-path">
            <span className="mail-deliverability-api-path-label">Yapılandırma API</span>
            <code>{webhooks.configureApiPath}</code>
          </p>
        </section>
      ) : null}

      <section
        id="mail-dmarc-aggregate"
        className={
          highlightDmarc
            ? "mail-posta-card mail-deliverability-focus-card"
            : "mail-posta-card"
        }
      >
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">DMARC aggregate</h3>
          <p className="mail-posta-card-desc">
            Rapor satırları ve SPF/DKIM geçiş oranları ({periodDays} gün).
          </p>
        </header>
        <div className="mail-deliverability-stat-grid">
          <StatTile
            label="Rapor satırı"
            value={hub.dmarc?.reportRows ?? 0}
          />
          <StatTile label="İleti sayısı" value={hub.dmarc?.messageCount ?? 0} />
          <StatTile
            label="DKIM pass"
            value={hub.dmarc?.dkimPassRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label="SPF pass"
            value={hub.dmarc?.spfPassRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile label="Toplam rapor (90g)" value={hub.dmarcReports90d} />
        </div>
      </section>

      {hub.hintsTr.length > 0 ? (
        <ul className="mail-deliverability-hints" role="list">
          {hub.hintsTr.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
