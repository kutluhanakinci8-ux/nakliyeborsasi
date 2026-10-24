"use client";

import { useState, type ReactNode } from "react";
import type { MailDeliverabilityHub } from "@/lib/mailApi";

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

function CopyButton({ label, value }: { label: string; value: string }) {
  const [hint, setHint] = useState("");
  return (
    <div className="mail-deliverability-copy-row">
      <button
        type="button"
        className="mail-premium-btn mail-premium-btn--ghost mail-deliverability-copy-btn"
        onClick={() =>
          void (async () => {
            const ok = await copyText(value);
            setHint(ok ? "Kopyalandı" : "Kopyalanamadı");
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
  const domain = hub.dns?.domain?.trim() || "sizin-domain.com";
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcValue = `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`;
  const bimiHost = `default._bimi.${domain}`;
  const bimiValue = hub.bimi?.logoUrl
    ? `v=BIMI1; l=${hub.bimi.logoUrl}`
    : `v=BIMI1; l=https://${domain}/logo.svg`;

  const steps: Step[] = [
    {
      id: "mx",
      title: "MX kaydı",
      done: Boolean(hub.dns?.mx),
      body: (
        <>
          <p className="mail-deliverability-step-desc">
            Posta kutunuzun gelen kutusu için MX kaydı doğrulanmalı.
          </p>
          <p className="mail-deliverability-step-status">
            Durum:{" "}
            <span className={hub.dns?.mx ? "is-ok" : "is-bad"}>
              {hub.dns?.mx ? "Doğrulandı" : "Eksik veya hatalı"}
            </span>
          </p>
        </>
      ),
    },
    {
      id: "spf",
      title: "SPF (TXT)",
      done: Boolean(hub.dns?.spf),
      body: (
        <>
          <p className="mail-deliverability-step-desc">
            Gönderen domain için SPF TXT kaydı — genelde{" "}
            <code>include:</code> Lerta posta sunucusu.
          </p>
          <p className="mail-deliverability-step-status">
            Durum:{" "}
            <span className={hub.dns?.spf ? "is-ok" : "is-bad"}>
              {hub.dns?.spf ? "Doğrulandı" : "Eksik"}
            </span>
          </p>
        </>
      ),
    },
    {
      id: "dkim",
      title: "DKIM",
      done: Boolean(hub.dns?.dkim),
      body: (
        <>
          <p className="mail-deliverability-step-desc">
            Seçilen gönderen kimliği için DKIM CNAME/TXT — konsol Domain sayfasından
            kopyalayın.
          </p>
          <p className="mail-deliverability-step-status">
            Durum:{" "}
            <span className={hub.dns?.dkim ? "is-ok" : "is-bad"}>
              {hub.dns?.dkim ? "Doğrulandı" : "Eksik"}
            </span>
          </p>
        </>
      ),
    },
    {
      id: "dmarc",
      title: "DMARC politikası",
      done: (hub.dmarc?.dkimPassRatePercent ?? 0) >= 90,
      body: (
        <>
          <p className="mail-deliverability-step-desc">
            Önce <code>p=none</code> ile izleme; aggregate raporlar bu panelde görünür.
            İtibar oturduğunda <code>quarantine</code> / <code>reject</code>.
          </p>
          <p className="mail-deliverability-host">
            <span className="mail-deliverability-host-label">Host</span>
            <code>{dmarcHost}</code>
          </p>
          <pre className="mail-deliverability-code">{dmarcValue}</pre>
          <CopyButton label="DMARC TXT kopyala" value={dmarcValue} />
          <p className="mail-deliverability-step-meta">
            DKIM pass (dönem): {hub.dmarc?.dkimPassRatePercent ?? "—"}%
          </p>
        </>
      ),
    },
    {
      id: "bimi",
      title: "BIMI (isteğe bağlı)",
      done: Boolean(hub.bimi?.okForBimi),
      body: (
        <>
          <p className="mail-deliverability-step-desc">
            DMARC <code>p=quarantine</code> veya <code>reject</code> sonrası Gmail/Apple
            inbox logosu için BIMI kaydı. SVG logo ve (bazı sağlayıcılarda) VMC
            sertifikası gerekir.
          </p>
          {hub.bimi ? (
            <p className="mail-deliverability-step-meta">
              Logo kontrolü: {hub.bimi.detailTr}
              {hub.bimi.contentType ? ` (${hub.bimi.contentType})` : ""}
            </p>
          ) : null}
          <p className="mail-deliverability-host">
            <span className="mail-deliverability-host-label">Host</span>
            <code>{bimiHost}</code>
          </p>
          <pre className="mail-deliverability-code">{bimiValue}</pre>
          <CopyButton label="BIMI TXT kopyala" value={bimiValue} />
        </>
      ),
    },
  ];

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
            DNS sihirbazı
          </h3>
          <p className="mail-posta-card-desc">
            {completed}/{steps.length} adım tamam — kayıtları DNS sağlayıcınıza ekleyin.
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
        aria-label="DNS kurulum ilerlemesi"
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
                {step.done ? "Tamam" : "Yapılacak"}
              </span>
            </div>
            <div className="mail-deliverability-wizard-step-body">{step.body}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
