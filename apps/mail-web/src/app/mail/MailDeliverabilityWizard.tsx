"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { MailDeliverabilityHub } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  hub: MailDeliverabilityHub;
};

type Step = {
  id: string;
  title: string;
  done: boolean;
  body: ReactNode;
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({
  label,
  copyLabel,
  value,
  t,
}: {
  label: string;
  copyLabel: string;
  value: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [hint, setHint] = useState("");
  return (
    <div className="mail-deliverability-copy-row">
      <button
        type="button"
        className="mail-premium-btn mail-premium-btn--ghost mail-deliverability-copy-btn"
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
      >
        {label}
      </button>
      {hint ? (
        <span className="mail-deliverability-copy-hint" role="status">{hint}</span>
      ) : null}
    </div>
  );
}

export function MailDeliverabilityWizard({ hub }: Props) {
  const { t } = useMailLocale();
  const domain = hub.dns?.domain?.trim() || t("delivDomainPlaceholder");
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcValue = `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`;
  const bimiHost = `default._bimi.${domain}`;
  const bimiValue = hub.bimi?.logoUrl
    ? `v=BIMI1; l=${hub.bimi.logoUrl}`
    : `v=BIMI1; l=https://${domain}/logo.svg`;

  const steps: Step[] = useMemo(
    () => [
      {
        id: "mx",
        title: t("delivStepMxTitle"),
        done: Boolean(hub.dns?.mx),
        body: (
          <>
            <p className="mail-deliverability-step-desc">{t("delivStepMxDesc")}</p>
            <p className="mail-deliverability-step-status">
              {t("delivStepStatusLabel")}{" "}
              <span className={hub.dns?.mx ? "is-ok" : "is-bad"}>
                {hub.dns?.mx ? t("delivStepVerified") : t("delivStepMxMissing")}
              </span>
            </p>
          </>
        ),
      },
      {
        id: "spf",
        title: t("delivStepSpfTitle"),
        done: Boolean(hub.dns?.spf),
        body: (
          <>
            <p className="mail-deliverability-step-desc">
              {t("delivStepSpfDescLead")}
              <code>include:</code>
              {t("delivStepSpfDescEnd")}
            </p>
            <p className="mail-deliverability-step-status">
              {t("delivStepStatusLabel")}{" "}
              <span className={hub.dns?.spf ? "is-ok" : "is-bad"}>
                {hub.dns?.spf ? t("delivStepVerified") : t("delivStepMissing")}
              </span>
            </p>
          </>
        ),
      },
      {
        id: "dkim",
        title: t("delivStepDkimTitle"),
        done: Boolean(hub.dns?.dkim),
        body: (
          <>
            <p className="mail-deliverability-step-desc">{t("delivStepDkimDesc")}</p>
            <p className="mail-deliverability-step-status">
              {t("delivStepStatusLabel")}{" "}
              <span className={hub.dns?.dkim ? "is-ok" : "is-bad"}>
                {hub.dns?.dkim ? t("delivStepVerified") : t("delivStepMissing")}
              </span>
            </p>
          </>
        ),
      },
      {
        id: "dmarc",
        title: t("delivStepDmarcTitle"),
        done: (hub.dmarc?.dkimPassRatePercent ?? 0) >= 90,
        body: (
          <>
            <p className="mail-deliverability-step-desc">
              {t("delivStepDmarcDescLead")}
              <code>p=none</code>
              {t("delivStepDmarcDescMid")}
              <code>quarantine</code> / <code>reject</code>
              {t("delivStepDmarcDescEnd")}
            </p>
            <p className="mail-deliverability-host">
              <span className="mail-deliverability-host-label">
                {t("delivHostLabel")}
              </span>
              <code>{dmarcHost}</code>
            </p>
            <pre className="mail-deliverability-code">{dmarcValue}</pre>
            <CopyButton
              label={t("delivCopyDmarcBtn")}
              copyLabel={t("delivCopyDmarcLabel")}
              value={dmarcValue}
              t={t}
            />
            <p className="mail-deliverability-step-meta">
              {t("delivDkimPassPeriod", {
                pct: hub.dmarc?.dkimPassRatePercent ?? "—",
              })}
            </p>
          </>
        ),
      },
      {
        id: "bimi",
        title: t("delivStepBimiTitle"),
        done: Boolean(hub.bimi?.okForBimi),
        body: (
          <>
            <p className="mail-deliverability-step-desc">
              {t("delivStepBimiDescLead")}
              <code>p=quarantine</code>
              {t("delivStepBimiDescMid")}
              <code>p=reject</code>
              {t("delivStepBimiDescEnd")}
            </p>
            {hub.bimi ? (
              <p className="mail-deliverability-step-meta">
                {t("delivBimiLogoCheck")} {hub.bimi.detailTr}
                {hub.bimi.contentType ? ` (${hub.bimi.contentType})` : ""}
              </p>
            ) : null}
            <p className="mail-deliverability-host">
              <span className="mail-deliverability-host-label">
                {t("delivHostLabel")}
              </span>
              <code>{bimiHost}</code>
            </p>
            <pre className="mail-deliverability-code">{bimiValue}</pre>
            <CopyButton
              label={t("delivCopyBimiBtn")}
              copyLabel={t("delivCopyBimiLabel")}
              value={bimiValue}
              t={t}
            />
          </>
        ),
      },
    ],
    [hub, t, dmarcHost, dmarcValue, bimiHost, bimiValue],
  );

  const completed = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completed / steps.length) * 100);

  return (
    <section
      className="mail-posta-card mail-deliverability-wizard mail-deliverability-wizard--premium"
      aria-labelledby="mail-dns-wizard-title"
    >
      <header className="mail-posta-card-head mail-deliverability-wizard-head">
        <div>
          <h3 id="mail-dns-wizard-title" className="mail-posta-card-title">
            {t("delivWizardTitle")}
          </h3>
          <p className="mail-posta-card-desc">
            {t("delivWizardDesc", {
              completed,
              total: steps.length,
            })}
          </p>
        </div>
        <span className="mail-deliverability-wizard-pill">{progressPct}%</span>
      </header>
      <div
        className="mail-deliverability-progress"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("delivWizardProgressAria")}
      >
        <span
          className="mail-deliverability-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ol className="mail-deliverability-wizard-steps">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={
              step.done
                ? "mail-deliverability-wizard-step is-done"
                : "mail-deliverability-wizard-step"
            }
          >
            <div className="mail-deliverability-wizard-step-head">
              <span className="mail-deliverability-wizard-step-index">
                {index + 1}
              </span>
              <span className="mail-deliverability-wizard-step-title">
                {step.title}
              </span>
              <span
                className={
                  step.done
                    ? "mail-deliverability-step-badge mail-deliverability-step-badge--done"
                    : "mail-deliverability-step-badge"
                }
              >
                {step.done ? t("delivWizardStepDone") : t("delivWizardStepTodo")}
              </span>
            </div>
            <div className="mail-deliverability-wizard-step-body">{step.body}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
