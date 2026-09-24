"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SubscriptionApiClient,
  type CompanySubscriptionPlanView,
  type CompanySubscriptionView,
} from "../../lib/SubscriptionApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

const MODULE_LABELS: Record<string, string> = {
  MARKETPLACE_SEARCH: "Yük arama",
  CONTACTS: "İletişim açılımı",
  AUCTION: "İhaleler",
  MESSAGING: "Mesajlaşma",
  TRUST_PROFILE: "Güven profili",
  FLEET: "Filo ve telematik",
  LANE_ANALYTICS: "Koridor analitiği",
  EXTERNAL_FEEDS: "Harici akışlar",
  API_ACCESS: "API erişimi",
};

function formatEur(amount: number | null): string {
  if (amount === null) {
    return "—";
  }
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type CompanySubscriptionPanelProps = {
  sectionId?: string;
  compact?: boolean;
};

export function CompanySubscriptionPanel({
  sectionId = "org-abonelik",
  compact = false,
}: CompanySubscriptionPanelProps) {
  const { accessToken, isReady } = useWebSession();
  const [subscriptionView, setSubscriptionView] =
    useState<CompanySubscriptionView | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [planActionMessage, setPlanActionMessage] = useState("");
  const [selectingPlanCode, setSelectingPlanCode] = useState("");

  useEffect(() => {
    if (!isReady || !accessToken) {
      return;
    }
    let cancelled = false;
    setSubscriptionLoading(true);
    setSubscriptionError("");
    void SubscriptionApiClient.fetchCompanySubscription(accessToken)
      .then((view) => {
        if (!cancelled) {
          setSubscriptionView(view);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubscriptionError(
            "Abonelik bilgisi yüklenemedi. Oturumu yenileyip tekrar deneyin.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSubscriptionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, isReady]);

  async function handleSelectPlan(plan: CompanySubscriptionPlanView): Promise<void> {
    if (!accessToken || !subscriptionView?.canManageSubscription) {
      return;
    }
    setSelectingPlanCode(plan.planCode);
    setPlanActionMessage("");
    setSubscriptionError("");
    try {
      const result = await SubscriptionApiClient.selectCompanyPlan(
        accessToken,
        plan.planCode,
      );
      setSubscriptionView((current) =>
        current
          ? {
              ...current,
              activePlan: result.activePlan,
              hasActiveSubscription: result.hasActiveSubscription,
            }
          : current,
      );
      setPlanActionMessage(
        `${plan.displayName} planı firmanız için etkinleştirildi. Tahsilat için Ödemeler sekmesini kullanın.`,
      );
      window.setTimeout(() => setPlanActionMessage(""), 6000);
    } catch {
      setSubscriptionError("Plan seçilemedi. Yetkinizi ve bağlantınızı kontrol edin.");
    } finally {
      setSelectingPlanCode("");
    }
  }

  const activePlanCode = subscriptionView?.activePlan?.planCode ?? "";

  return (
    <section
      id={sectionId}
      className="account-card account-subscription-panel module-panel module-panel--elevated account-org-section"
    >
      <header className="account-card-head">
        <div>
          <p className="account-subscription-kicker">Firma aboneliği</p>
          <h2 className="account-card-title">Plan ve modül erişimi</h2>
          <p className="account-card-lead">
            Modül erişimi <strong>firma</strong> düzeyinde tanımlanır (TIMOCOM / Transporeon
            modeli). Plan seçimi burada; kart, fatura ve tahsilat{" "}
            <Link href="/hesap/odemeler">ödemeler</Link> sekmesinde.
          </p>
        </div>
        <Link href="/hesap/odemeler" className="btn-account-ghost">
          Faturalama
        </Link>
      </header>

      {subscriptionLoading ? (
        <p className="account-subscription-hint">Abonelik yükleniyor…</p>
      ) : null}
      {subscriptionError ? (
        <p className="account-subscription-error" role="alert">{subscriptionError}</p>
      ) : null}
      {planActionMessage ? (
        <p className="account-subscription-success">{planActionMessage}</p>
      ) : null}

      {!subscriptionLoading && subscriptionView && !subscriptionView.hasActiveSubscription ? (
        <div className="account-subscription-alert" role="status">
          <strong>Aktif abonelik gerekli.</strong> Platform modüllerini kullanmak için bir
          plan seçin.
        </div>
      ) : null}

      {subscriptionView?.activePlan ? (
        <div className="account-subscription-active">
          <span className="account-subscription-active-label">Aktif plan</span>
          <span className="account-subscription-active-name">
            {subscriptionView.activePlan.displayName}
          </span>
          <span className="account-subscription-active-price">
            {formatEur(subscriptionView.activePlan.monthlyPriceEur)} / ay
          </span>
        </div>
      ) : null}

      {compact ? (
        <p className="account-org-compact-hint">
          Plan değiştirmek için tam kart görünümü aşağıda veya ödemeler sekmesindeki özetten
          devam edin.
        </p>
      ) : null}

      <div className={compact ? "account-plan-grid account-plan-grid--compact" : "account-plan-grid"}>
        {subscriptionView?.catalog.map((plan) => {
          const isActive = plan.planCode === activePlanCode;
          const isSelecting = selectingPlanCode === plan.planCode;
          return (
            <article
              key={plan.planCode}
              className={
                plan.recommended
                  ? "account-plan-card account-plan-card--featured"
                  : "account-plan-card"
              }
              data-active={isActive ? "true" : "false"}
            >
              {plan.recommended ? (
                <span className="account-plan-badge">Önerilen</span>
              ) : null}
              <h3 className="account-plan-name">{plan.displayName}</h3>
              <p className="account-plan-tagline">{plan.tagline}</p>
              <p className="account-plan-price">
                <span className="account-plan-price-value">
                  {formatEur(plan.monthlyPriceEur)}
                </span>
                <span className="account-plan-price-unit">/ ay</span>
              </p>
              {!compact ? (
                <>
                  <p className="account-plan-annual">
                    Yıllık {formatEur(plan.annualPriceEur)} (2 ay tasarruf)
                  </p>
                  <ul className="account-plan-modules">
                    {plan.includedModules.map((moduleCode) => (
                      <li key={moduleCode}>
                        {MODULE_LABELS[moduleCode] ?? moduleCode}
                      </li>
                    ))}
                  </ul>
                  <p className="account-plan-meta">
                    {plan.maxConcurrentSearchTabs} paralel arama ·{" "}
                    {plan.laneAnalyticsHistoryDays} gün koridor geçmişi
                  </p>
                </>
              ) : null}
              {subscriptionView.canManageSubscription ? (
                <button
                  type="button"
                  className={
                    isActive
                      ? "btn-account-ghost account-plan-cta"
                      : "btn-account-primary account-plan-cta"
                  }
                  disabled={isActive || isSelecting}
                  onClick={() => void handleSelectPlan(plan)}
                >
                  {isActive
                    ? "Mevcut plan"
                    : isSelecting
                      ? "Etkinleştiriliyor…"
                      : "Bu planı seç"}
                </button>
              ) : (
                <p className="account-plan-readonly">
                  Plan değişikliği yalnızca firma sahibi veya fatura yöneticisi tarafından
                  yapılabilir.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
