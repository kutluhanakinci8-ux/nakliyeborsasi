"use client";

import type { ReactNode } from "react";
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

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

export function MailDeliverabilityWizard({ hub }: Props) {
  const domain = hub.dns?.domain?.trim() || "sizin-domain.com";
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcValue = `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`;
  const bimiHost = `default._bimi.${domain}`;
  const bimiValue = `v=BIMI1; l=https://${domain}/logo.svg`;

  const steps: Step[] = [
    {
      id: "mx",
      title: "1. MX kaydı",
      done: Boolean(hub.dns?.mx),
      body: (
        <>
          <p>Posta kutunuzun gelen kutusu için MX kaydı doğrulanmalı.</p>
          <p className="mail-deliverability-muted">
            Durum: {hub.dns?.mx ? "✓ Doğrulandı" : "✗ Eksik veya hatalı"}
          </p>
        </>
      ),
    },
    {
      id: "spf",
      title: "2. SPF (TXT)",
      done: Boolean(hub.dns?.spf),
      body: (
        <>
          <p>
            Gönderen domain için SPF TXT kaydı — genelde{" "}
            <code>include:</code> Lerta posta sunucusu.
          </p>
          <p className="mail-deliverability-muted">
            Durum: {hub.dns?.spf ? "✓ Doğrulandı" : "✗ Eksik"}
          </p>
        </>
      ),
    },
    {
      id: "dkim",
      title: "3. DKIM",
      done: Boolean(hub.dns?.dkim),
      body: (
        <>
          <p>Seçilen gönderen kimliği için DKIM CNAME/TXT — konsol Domain sayfasından kopyalayın.</p>
          <p className="mail-deliverability-muted">
            Durum: {hub.dns?.dkim ? "✓ Doğrulandı" : "✗ Eksik"}
          </p>
        </>
      ),
    },
    {
      id: "dmarc",
      title: "4. DMARC politikası",
      done: (hub.dmarc?.dkimPassRatePercent ?? 0) >= 90,
      body: (
        <>
          <p>
            Önce <code>p=none</code> ile izleme; aggregate raporlar bu panelde görünür. İtibar
            oturduğunda <code>quarantine</code> / <code>reject</code>.
          </p>
          <p>
            <strong>Host:</strong> <code>{dmarcHost}</code>
          </p>
          <p>
            <strong>Örnek TXT:</strong>
          </p>
          <pre className="mail-deliverability-wizard-pre">{dmarcValue}</pre>
          <button
            type="button"
            className="compose-chip-btn"
            onClick={() => copyText(dmarcValue)}
          >
            DMARC TXT kopyala
          </button>
          <p className="mail-deliverability-muted">
            DKIM pass (dönem): {hub.dmarc?.dkimPassRatePercent ?? "—"}%
          </p>
        </>
      ),
    },
    {
      id: "bimi",
      title: "5. BIMI (isteğe bağlı)",
      done: false,
      body: (
        <>
          <p>
            DMARC <code>p=quarantine</code> veya <code>reject</code> sonrası Gmail/Apple inbox
            logosu için BIMI kaydı. SVG logo ve (bazı sağlayıcılarda) VMC sertifikası gerekir.
          </p>
          <p>
            <strong>Host:</strong> <code>{bimiHost}</code>
          </p>
          <pre className="mail-deliverability-wizard-pre">{bimiValue}</pre>
          <button
            type="button"
            className="compose-chip-btn"
            onClick={() => copyText(bimiValue)}
          >
            BIMI TXT kopyala
          </button>
        </>
      ),
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <section className="mail-deliverability-wizard" aria-labelledby="mail-dns-wizard-title">
      <h4 id="mail-dns-wizard-title" className="mail-deliverability-subhead">
        DNS sihirbazı ({completed}/{steps.length} tamam)
      </h4>
      <ol className="mail-deliverability-wizard-steps">
        {steps.map((step) => (
          <li
            key={step.id}
            className={
              step.done
                ? "mail-deliverability-wizard-step is-done"
                : "mail-deliverability-wizard-step"
            }
          >
            <div className="mail-deliverability-wizard-step-head">
              <span className="mail-deliverability-wizard-step-title">{step.title}</span>
              <span className="mail-deliverability-wizard-step-badge">
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
