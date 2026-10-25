"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMailOpsSnapshot,
  type MailOpsRunbookRef,
  type MailOpsSnapshot,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
  highlightRunbook?: boolean;
};

function scoreTone(score: number): "good" | "mid" | "low" {
  if (score >= 80) {
    return "good";
  }
  if (score >= 50) {
    return "mid";
  }
  return "low";
}

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

function StatusPill({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={
        active
          ? "mail-ops-status-pill mail-ops-status-pill--on"
          : "mail-ops-status-pill mail-ops-status-pill--off"
      }
    >
      {label}
    </span>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyPathButton({
  value,
  copyLabel,
  t,
}: {
  value: string;
  copyLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [hint, setHint] = useState("");
  return (
    <button
      type="button"
      className="mail-premium-btn mail-premium-btn--ghost mail-ops-copy-btn"
      onClick={() =>
        void (async () => {
          const ok = await copyText(value);
          setHint(
            ok
              ? t("settingsCopied", { label: copyLabel })
              : t("settingsCopyFailed"),
          );
          window.setTimeout(() => setHint(""), 2000);
        })()
      }
      title={copyLabel}
    >
      {hint || t("actionCopy")}
    </button>
  );
}

function RunbookCard({
  book,
  t,
}: {
  book: MailOpsRunbookRef;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <li className="mail-ops-runbook-card">
      <div className="mail-ops-runbook-head">
        <span className="mail-ops-runbook-id">{book.id}</span>
        <CopyPathButton
          value={book.docPath}
          copyLabel={t("opsDocPathLabel")}
          t={t}
        />
      </div>
      <p className="mail-ops-runbook-doc">
        <span className="mail-ops-runbook-field-label">{t("opsDocLabel")}</span>
        <code>{book.docPath}</code>
      </p>
      {book.verifyScript ? (
        <p className="mail-ops-runbook-verify">
          <span className="mail-ops-runbook-field-label">
            {t("opsVerifyLabel")}
          </span>
          <code>{book.verifyScript}</code>
          <CopyPathButton
            value={book.verifyScript}
            copyLabel={t("opsScriptPathLabel")}
            t={t}
          />
        </p>
      ) : null}
    </li>
  );
}

export function MailOpsSnapshotPanel({
  accessToken,
  highlightRunbook = false,
}: Props) {
  const { t, localeTag } = useMailLocale();
  const [snapshot, setSnapshot] = useState<MailOpsSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatGeneratedAt = useCallback(
    (iso: string): string => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) {
        return iso;
      }
      return date.toLocaleString(localeTag);
    },
    [localeTag],
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await fetchMailOpsSnapshot(accessToken);
      setSnapshot(payload.snapshot);
    } catch {
      setError(t("opsErrLoad"));
      setSnapshot(null);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (!highlightRunbook || !snapshot) {
      return;
    }
    document
      .getElementById("mail-ops-runbooks")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightRunbook, snapshot]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && !snapshot) {
    return (
      <div className="mail-ops-panel mail-ops-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <p className="mail-accounts-status mail-accounts-status--err" role="alert">
        {error}
      </p>
    );
  }

  if (!snapshot) {
    return null;
  }

  const tone = scoreTone(snapshot.deliverability.score);
  const periodDays = snapshot.deliverability.periodDays;
  const bridgeState = snapshot.integration.jmap.bridge
    ? t("opsStateOpen")
    : t("opsStateClosed");
  const aiState = snapshot.integration.aiComposeEnabled
    ? t("opsStateEnabled")
    : t("opsStateClosed");

  return (
    <div className="mail-ops-panel mail-ops-panel--premium">
      {highlightRunbook ? (
        <div className="mail-notify-info mail-notify-info--pwa" role="status">
          <span className="mail-notify-info-icon" aria-hidden="true">📋</span>
          <div>
            <p className="mail-notify-info-title">{t("opsRunbookFocusTitle")}</p>
            <p className="mail-notify-info-body">{t("opsRunbookFocusBody")}</p>
          </div>
        </div>
      ) : null}

      <section className="mail-posta-card mail-ops-meta-card">
        <header className="mail-ops-meta-head">
          <div>
            <h3 className="mail-posta-card-title">{t("opsOrgSnapshotTitle")}</h3>
            <p className="mail-posta-card-desc">
              {formatGeneratedAt(snapshot.generatedAt)}
            </p>
          </div>
          <span className="mail-ops-phase-pill">{snapshot.phaseCode}</span>
        </header>
        <p className="mail-ops-org-id">
          <span className="mail-ops-runbook-field-label">
            {t("opsOrganizationLabel")}
          </span>
          <code>{snapshot.organizationId}</code>
        </p>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-ops-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("opsImapTitle")}</h3>
            <p className="mail-posta-card-desc">{t("opsImapDesc")}</p>
          </div>
          <StatusPill
            label={
              snapshot.imap.enabled
                ? t("opsStatusEnabled")
                : t("opsStatusDisabled")
            }
            active={snapshot.imap.enabled}
          />
        </header>
        {snapshot.imap.maildirPath ? (
          <p className="mail-ops-kv">
            <span className="mail-ops-runbook-field-label">
              {t("opsMaildirLabel")}
            </span>
            <code>{snapshot.imap.maildirPath}</code>
          </p>
        ) : null}
        <p className="mail-ops-kv mail-ops-kv--row">
          <span className="mail-ops-runbook-field-label">
            {t("opsHealthApiLabel")}
          </span>
          <code>{snapshot.imap.imapHealthPath}</code>
          <CopyPathButton
            value={snapshot.imap.imapHealthPath}
            copyLabel={t("opsHealthApiPathLabel")}
            t={t}
          />
        </p>
      </section>

      <section className="mail-posta-card mail-ops-delivery-card">
        <header className="mail-deliverability-score-head">
          <div
            className={`mail-deliverability-score-ring mail-deliverability-score-ring--${tone} mail-ops-score-ring`}
            aria-hidden="true"
          >
            <span className="mail-deliverability-score-number">
              {snapshot.deliverability.score}
            </span>
            <span className="mail-deliverability-score-max">/100</span>
          </div>
          <div>
            <h3 className="mail-posta-card-title">
              {t("opsDeliveryTitle", { days: periodDays })}
            </h3>
            <p className="mail-posta-card-desc">{t("opsDeliveryDesc")}</p>
          </div>
        </header>
        <div className="mail-deliverability-stat-grid mail-deliverability-stat-grid--3">
          <StatTile
            label={t("delivStatSent")}
            value={snapshot.deliverability.sentInPeriod}
          />
          <StatTile
            label={t("delivStatBounce")}
            value={snapshot.deliverability.bounceRatePercent ?? "—"}
            suffix="%"
          />
          <StatTile
            label={t("delivStatEndpoint")}
            value={snapshot.deliverability.webhookEndpointCount}
          />
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("opsIntegrationTitle")}</h3>
          <p className="mail-posta-card-desc">{t("opsIntegrationDesc")}</p>
        </header>
        <div className="mail-ops-integration-row">
          <StatusPill
            label={t("opsJmapBridge", { state: bridgeState })}
            active={snapshot.integration.jmap.bridge}
          />
          <StatusPill
            label={t("opsAiCompose", { state: aiState })}
            active={snapshot.integration.aiComposeEnabled}
          />
        </div>
        <p className="mail-ops-kv">
          <span className="mail-ops-runbook-field-label">
            {t("opsJmapSession")}
          </span>
          <code>{snapshot.integration.jmap.sessionPath}</code>
        </p>
        <p className="mail-ops-kv">
          <span className="mail-ops-runbook-field-label">
            {t("opsJmapInvoke")}
          </span>
          <code>{snapshot.integration.jmap.invokePath}</code>
        </p>
      </section>

      <section
        id="mail-ops-runbooks"
        className={
          highlightRunbook
            ? "mail-posta-card mail-deliverability-focus-card"
            : "mail-posta-card"
        }
      >
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("opsRunbooksTitle")}</h3>
          <p className="mail-posta-card-desc">{t("opsRunbooksDesc")}</p>
        </header>
        <ul className="mail-ops-runbook-list">
          {snapshot.runbooks.map((book) => (
            <RunbookCard key={book.id} book={book} t={t} />
          ))}
        </ul>
        <div className="mail-ops-public-status">
          <span className="mail-ops-runbook-field-label">
            {t("opsPublicStatusLabel")}
          </span>
          <div className="mail-ops-kv mail-ops-kv--row">
            <code>{snapshot.ekolojikPublicStatusPath}</code>
            <CopyPathButton
              value={snapshot.ekolojikPublicStatusPath}
              copyLabel={t("opsPublicStatusPathLabel")}
              t={t}
            />
          </div>
        </div>
      </section>

      <div className="mail-ops-actions">
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary"
          disabled={refreshing}
          onClick={() => void onRefresh()}
        >
          {refreshing ? t("actionRefreshing") : t("refresh")}
        </button>
      </div>
    </div>
  );
}
