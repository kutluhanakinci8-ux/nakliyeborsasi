"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchDeliverabilityHub,
  type MailDeliverabilityHub,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";
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
  const { t } = useMailLocale();
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
      setError(t("delivErrLoadHub"));
      setHub(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, days, t]);

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
            <p className="mail-notify-info-title">{t("delivDmarcFocusTitle")}</p>
            <p className="mail-notify-info-body">{t("delivDmarcFocusBody")}</p>
          </div>
        </div>
      ) : null}
      {highlightEngagement ? (
        <div className="mail-notify-info mail-notify-info--pwa" role="status">
          <span className="mail-notify-info-icon" aria-hidden="true">📈</span>
          <div>
            <p className="mail-notify-info-title">
              {t("delivEngagementFocusTitle")}
            </p>
            <p className="mail-notify-info-body">
              {t("delivEngagementFocusBodyLead")}
              <code>message.opened</code>, <code>message.clicked</code>
              {t("delivEngagementFocusBodyAnd")}
              <code>message.bounced</code>
              {t("delivEngagementFocusBodyEnd")}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mail-posta-intro">{t("delivIntro")}</p>

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
            <h3 className="mail-posta-card-title">{t("delivScoreTitle")}</h3>
            <p className="mail-posta-card-desc">
              {t("delivScoreDesc", { days: periodDays })}
            </p>
            <div
              className="mail-posta-chips mail-posta-chips--equal mail-deliverability-period-chips"
              role="group"
              aria-label={t("delivPeriodAria")}
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
                  <span className="mail-posta-chip-label">
                    {t("delivPeriodDays", { count: option })}
                  </span>
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
            {t("delivNoCustomDomain")}
          </p>
        )}
      </section>

      <MailDeliverabilityWizard hub={hub} />

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("delivReputationTitle")}</h3>
          <p className="mail-posta-card-desc">{t("delivReputationDesc")}</p>
        </header>
        <ul className="mail-deliverability-links">
          <li>
            <a
              href="https://postmaster.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mail-deliverability-link"
            >
              {t("delivLinkPostmaster")}
            </a>
          </li>
          <li>{t("delivReputationDmarcConsole")}</li>
          <li>{t("delivReputationPtrSpfDkim")}</li>
          <li>
            {t("delivReputationBimiLead")}
            <code>p=quarantine</code>
            {t("delivReputationBimiMid")}
            <code>p=reject</code>
            {t("delivReputationBimiEnd")}
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
          <h3 className="mail-posta-card-title">{t("delivEngagementTitle")}</h3>
          <p className="mail-posta-card-desc">
            {t("delivEngagementDesc", { days: periodDays })}
          </p>
        </header>
        <div className="mail-deliverability-stat-grid">
          <StatTile label={t("delivStatSent")} value={engagement?.sentInPeriod ?? "—"} />
          <StatTile
            label={t("delivStatBounce")}
            value={engagement?.bounceRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label={t("delivStatOpen")}
            value={engagement?.openRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label={t("delivStatClick")}
            value={engagement?.clickRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile label={t("delivStatSuppression")} value={hub.suppressionCount} />
        </div>
        {engagement?.bounceByClass &&
        Object.keys(engagement.bounceByClass).length > 0 ? (
          <ul className="mail-deliverability-bounce-class">
            {Object.entries(engagement.bounceByClass).map(([cls, count]) => (
              <li key={cls}>
                <span className="mail-deliverability-bounce-label">
                  {t("delivBounceClass", { cls })}
                </span>
                <span className="mail-deliverability-bounce-count">{count}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {hub.bounceIntelligence ? (
          <div className="mail-deliverability-bounce-intel">
            <p className="compose-attach-hint">{hub.bounceIntelligence.reputationHintTr}</p>
            <div className="mail-deliverability-stat-grid mail-deliverability-stat-grid--3">
              <StatTile
                label={t("delivStatHardBounce")}
                value={hub.bounceIntelligence.hardBounces}
              />
              <StatTile
                label={t("delivStatSoftBounce")}
                value={hub.bounceIntelligence.softBounces}
              />
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
              <h3 className="mail-posta-card-title">{t("delivWebhookTitle")}</h3>
              <p className="mail-posta-card-desc">{t("delivWebhookDesc")}</p>
            </div>
            <span
              className={
                webhooks.publicApiAllowed
                  ? "mail-deliverability-wizard-pill"
                  : "mail-deliverability-step-badge"
              }
            >
              {webhooks.publicApiAllowed
                ? t("delivPublicApiOn")
                : t("delivPlanRequired")}
            </span>
          </header>
          <div className="mail-deliverability-stat-grid mail-deliverability-stat-grid--3">
            <StatTile
              label={t("delivStatEndpoint")}
              value={`${webhooks.enabledEndpointCount} / ${webhooks.endpointCount}`}
            />
            <StatTile
              label={t("delivStatSubscribedEvents")}
              value={
                webhooks.subscribedEvents.length > 0
                  ? webhooks.subscribedEvents.length
                  : "—"
              }
            />
            <StatTile label={t("delivStatActive")} value={webhooks.enabledEndpointCount} />
          </div>
          <p className="mail-deliverability-events">
            <span className="mail-deliverability-events-label">
              {t("delivEventsLabel")}
            </span>
            {webhooks.engagementWebhookEvents.join(", ")}
          </p>
          <p className="mail-deliverability-api-path">
            <span className="mail-deliverability-api-path-label">
              {t("delivConfigApiLabel")}
            </span>
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
          <h3 className="mail-posta-card-title">{t("delivDmarcTitle")}</h3>
          <p className="mail-posta-card-desc">
            {t("delivDmarcDesc", { days: periodDays })}
          </p>
        </header>
        <div className="mail-deliverability-stat-grid">
          <StatTile
            label={t("delivStatReportRows")}
            value={hub.dmarc?.reportRows ?? 0}
          />
          <StatTile
            label={t("delivStatMessageCount")}
            value={hub.dmarc?.messageCount ?? 0}
          />
          <StatTile
            label={t("delivStatDkimPass")}
            value={hub.dmarc?.dkimPassRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label={t("delivStatSpfPass")}
            value={hub.dmarc?.spfPassRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile label={t("delivStatReports90d")} value={hub.dmarcReports90d} />
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
