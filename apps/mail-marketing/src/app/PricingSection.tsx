"use client";

import { useEffect, useState } from "react";

type MailPlan = {
  planCode: string;
  displayName: string;
  tagline: string;
  monthlyPriceEur: number;
  annualPriceEur: number;
  recommended: boolean;
  mailMaxSendsPerHour: number;
  mailMaxMailboxes: number;
  mailStorageLimitGb: number;
  mailMaxAttachmentMb: number;
  customDomainAllowed: boolean;
  mailWhiteLabelAllowed?: boolean;
  mailPublicApiAllowed?: boolean;
  monthlyPriceTry?: number;
  annualPriceTry?: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://yonetim.lerta.com.tr/api/v1";
const CONSOLE =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";

export function PricingSection() {
  const [plans, setPlans] = useState<MailPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/subscriptions/mail-plans`);
        if (!response.ok) {
          throw new Error("plans");
        }
        const data = (await response.json()) as { plans: MailPlan[] };
        setPlans(data.plans);
      } catch {
        setError("Plan listesi yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const registerHref = (planCode: string) =>
    `${CONSOLE.replace(/\/$/, "")}/register?plan=${encodeURIComponent(planCode)}`;
  const corporateCheckoutHint = `${CONSOLE.replace(/\/$/, "")}/dashboard`;

  return (
    <section className="pricing" id="fiyatlar">
      <h2>Planlar</h2>
      <p className="pricing-lead">
        Fiyatlar API kataloğundan gelir. Kayıt{" "}
        <strong>yonetim.lerta.com.tr</strong> üzerinden.
      </p>
      {loading ? (
        <p className="pricing-lead">Planlar yükleniyor…</p>
      ) : null}
      {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.planCode}
            className={`price-card ${plan.recommended ? "highlight" : ""}`}
          >
            <h3>{plan.displayName}</h3>
            <p className="price">
              {plan.monthlyPriceEur === 0
                ? "Ücretsiz"
                : `€${plan.monthlyPriceEur}/ay`}
              {plan.monthlyPriceTry && plan.monthlyPriceTry > 0
                ? ` · ₺${plan.monthlyPriceTry}/ay`
                : ""}
            </p>
            <p className="price-period">{plan.tagline}</p>
            {plan.planCode === "lerta_mail_pilot_tr" ? (
              <p className="price-period" style={{ fontWeight: 600 }}>
                Ücretsiz pilot · 1 kutu · 80 e-posta/saat
              </p>
            ) : null}
            <ul>
              <li>{plan.mailMaxSendsPerHour} gönderim / saat</li>
              <li>{plan.mailMaxMailboxes} posta kutusu</li>
              <li>{plan.mailStorageLimitGb} GB depolama</li>
              <li>Tek ek en fazla {plan.mailMaxAttachmentMb} MB</li>
              <li>
                {plan.customDomainAllowed
                  ? "Özel domain"
                  : "Pilot adres (@lerta.com.tr)"}
              </li>
              {plan.mailWhiteLabelAllowed ? (
                <li>White-label e-posta</li>
              ) : null}
              {plan.mailPublicApiAllowed ? (
                <li>Public API + webhook</li>
              ) : null}
            </ul>
            <a
              className={`btn ${plan.recommended ? "btn-primary" : "btn-ghost"}`}
              href={
                plan.customDomainAllowed
                  ? registerHref(plan.planCode)
                  : registerHref(plan.planCode)
              }
            >
              {plan.customDomainAllowed
                ? "Domain ile kayıt"
                : "Pilot kayıt"}
            </a>
            {plan.customDomainAllowed ? (
              <p className="price-period" style={{ marginTop: 12 }}>
                Kayıt sonrası{" "}
                <a href={corporateCheckoutHint}>Öde ve Kurumsal’a geç</a>
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
