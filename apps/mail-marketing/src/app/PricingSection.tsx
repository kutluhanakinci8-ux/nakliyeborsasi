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
  customDomainAllowed: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://yonetim.lerta.com.tr/api/v1";
const CONSOLE =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";

export function PricingSection() {
  const [plans, setPlans] = useState<MailPlan[]>([]);
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
      }
    })();
  }, []);

  const registerHref = `${CONSOLE.replace(/\/$/, "")}/register`;
  const domainHref = `${CONSOLE.replace(/\/$/, "")}/domain`;

  return (
    <section className="pricing" id="fiyatlar">
      <h2>Planlar</h2>
      <p className="pricing-lead">
        Fiyatlar API kataloğundan gelir. Kayıt{" "}
        <strong>yonetim.lerta.com.tr</strong> üzerinden.
      </p>
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
            </p>
            <p className="price-period">{plan.tagline}</p>
            <ul>
              <li>{plan.mailMaxSendsPerHour} gönderim / saat</li>
              <li>
                {plan.customDomainAllowed
                  ? "Özel domain"
                  : "Pilot alt alan (kullanici.lerta.com.tr)"}
              </li>
            </ul>
            <a
              className={`btn ${plan.recommended ? "btn-primary" : "btn-ghost"}`}
              href={
                plan.customDomainAllowed ? domainHref : registerHref
              }
            >
              {plan.customDomainAllowed ? "Domain ile başla" : "Kayıt ol"}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
