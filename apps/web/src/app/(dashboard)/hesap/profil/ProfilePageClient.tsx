"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  resolveAccountDisplayName,
  resolveAccountInitials,
} from "../../../../lib/accountNavigation";
import { loadOrganizationProfile } from "../../../../lib/organizationProfile";
import {
  SubscriptionApiClient,
  type CompanySubscriptionPlanView,
  type CompanySubscriptionView,
} from "../../../../lib/SubscriptionApiClient";
import { useWebSession } from "../../../../context/WebSessionProvider";

type UserProfile = {
  fullName: string;
  jobTitle: string;
  phone: string;
  interfaceLocale: string;
  notifyNewOffers: boolean;
  notifyMessages: boolean;
  notifyAuctions: boolean;
  notifyWeeklyDigest: boolean;
};

const STORAGE_PREFIX = "nb-user-profile:";

const ROLE_LABELS: Record<string, string> = {
  COMPANY_OWNER: "Firma yöneticisi",
  DISPATCHER: "Dispatch / operasyon",
  VIEWER: "Görüntüleme",
  BILLING_ADMIN: "Fatura ve ödeme",
};

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

function defaultProfile(emailAddress: string): UserProfile {
  return {
    fullName: resolveAccountDisplayName(emailAddress),
    jobTitle: "",
    phone: "",
    interfaceLocale: "tr",
    notifyNewOffers: true,
    notifyMessages: true,
    notifyAuctions: true,
    notifyWeeklyDigest: false,
  };
}

function loadProfile(userId: string, emailAddress: string): UserProfile {
  if (typeof window === "undefined") {
    return defaultProfile(emailAddress);
  }
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
  if (!raw) {
    return defaultProfile(emailAddress);
  }
  try {
    return {
      ...defaultProfile(emailAddress),
      ...(JSON.parse(raw) as UserProfile),
    };
  } catch {
    return defaultProfile(emailAddress);
  }
}

export function ProfilePageClient() {
  const { session, locale, setLocale, logout, accessToken, isReady } =
    useWebSession();
  const userId = session?.userId ?? "";
  const companyId = session?.companyId ?? "";
  const emailAddress = session?.emailAddress ?? "";
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [profile, setProfile] = useState<UserProfile>(() =>
    defaultProfile(emailAddress),
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [subscriptionView, setSubscriptionView] =
    useState<CompanySubscriptionView | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [planActionMessage, setPlanActionMessage] = useState("");
  const [selectingPlanCode, setSelectingPlanCode] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }
    const loaded = loadProfile(userId, emailAddress);
    setProfile(loaded);
    if (loaded.interfaceLocale) {
      setLocale(loaded.interfaceLocale);
    }
  }, [userId, emailAddress, setLocale]);

  useEffect(() => {
    if (!companyId) {
      setCompanyLogoUrl("");
      return;
    }
    const orgProfile = loadOrganizationProfile(companyId, emailAddress);
    setCompanyLogoUrl(orgProfile.logoUrl);
  }, [companyId, emailAddress]);

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
        `${plan.displayName} planı firmanız için etkinleştirildi. Faturalama için Ödemeler sekmesini kullanın.`,
      );
      window.setTimeout(() => setPlanActionMessage(""), 6000);
    } catch {
      setSubscriptionError("Plan seçilemedi. Yetkinizi ve bağlantınızı kontrol edin.");
    } finally {
      setSelectingPlanCode("");
    }
  }

  function persistProfile(next: UserProfile): void {
    if (!userId) {
      return;
    }
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
    window.localStorage.setItem("nb-ui-locale", next.interfaceLocale);
    setSaveMessage("Profil kaydedildi (demo — tarayıcıda saklanır).");
    window.setTimeout(() => setSaveMessage(""), 4000);
  }

  function updateProfile(patch: Partial<UserProfile>): void {
    setProfile((current) => ({ ...current, ...patch }));
  }

  function handlePersonalSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    persistProfile(profile);
  }

  function handleLocaleChange(nextLocale: string): void {
    setLocale(nextLocale);
    setProfile((current) => {
      const next = { ...current, interfaceLocale: nextLocale };
      persistProfile(next);
      return next;
    });
  }

  function toggleNotification(
    key: keyof Pick<
      UserProfile,
      "notifyNewOffers" | "notifyMessages" | "notifyAuctions" | "notifyWeeklyDigest"
    >,
  ): void {
    setProfile((current) => {
      const next = { ...current, [key]: !current[key] };
      persistProfile(next);
      return next;
    });
  }

  const initials = resolveAccountInitials(emailAddress);
  const roles = session?.roleCodes ?? [];
  const activePlanCode = subscriptionView?.activePlan?.planCode ?? "";

  return (
    <div className="account-profile-page account-profile-page--premium">
      <section
        className="account-profile-banner account-profile-banner--premium module-panel module-panel--elevated"
        aria-label="Profil özeti"
      >
        <div className="account-profile-identity">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt=""
              className="account-profile-avatar account-profile-avatar--logo"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="account-profile-avatar" aria-hidden>{initials}</span>
          )}
          <div>
            <p className="account-verify-eyebrow">Hesap sahibi</p>
            <h2 className="account-card-title">
              {profile.fullName || resolveAccountDisplayName(emailAddress)}
            </h2>
            <p className="account-card-lead">{emailAddress || "—"}</p>
            <div className="account-verify-badges">
              {roles.length === 0 ? (
                <span className="account-status-pill">Rol atanmadı</span>
              ) : (
                roles.map((role) => (
                  <span key={role} className="account-status-pill account-status-pill--ok">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="account-verify-aside">
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">{locale.toUpperCase()}</span>
            <span className="account-verify-stat-label">Arayüz dili</span>
          </div>
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">
              {session?.companyId?.slice(0, 8) ?? "—"}
            </span>
            <span className="account-verify-stat-label">Bağlı firma</span>
          </div>
        </div>
      </section>

      <section className="account-card account-subscription-panel module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <p className="account-subscription-kicker">Firma aboneliği</p>
            <h2 className="account-card-title">Plan ve modül erişimi</h2>
            <p className="account-card-lead">
              Nakliye Borsası modülleri firma aboneliği ile açılır. TR · UA · EU
              operasyonları için planınızı seçin; faturalama ve ödeme yöntemleri
              ödemeler sekmesinde yapılandırılır.
            </p>
          </div>
          <Link href="/hesap/odemeler" className="btn-account-ghost">
            Faturalama ayarları
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
            <strong>Aktif abonelik gerekli.</strong> Platformu kullanmaya devam etmek için
            bir plan seçin. Mevcut verileriniz korunur; yalnızca modül erişimi plana bağlanır.
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

        <div className="account-plan-grid">
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
                  {plan.maxConcurrentSearchTabs} paralel arama sekmesi ·{" "}
                  {plan.laneAnalyticsHistoryDays} gün koridor geçmişi
                </p>
                {subscriptionView.canManageSubscription ? (
                  <button
                    type="button"
                    className={
                      isActive ? "btn-account-ghost account-plan-cta" : "btn-account-primary account-plan-cta"
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
                    Plan değişikliği yalnızca firma sahibi veya fatura yöneticisi
                    tarafından yapılabilir.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="account-profile-columns">
      <form
        className="account-card module-panel module-panel--elevated"
        onSubmit={handlePersonalSubmit}
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Kişisel bilgiler</h2>
            <p className="account-card-lead">
              Adınız ve iletişim bilgileriniz ekip içi görünürlük ve bildirimler için
              kullanılır. E-posta adresi giriş için sabittir.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Kaydet</button>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Görünen ad
            <input
              className="input-light"
              value={profile.fullName}
              onChange={(event) => updateProfile({ fullName: event.target.value })}
              placeholder="Ad Soyad"
            />
          </label>
          <label className="label-light">
            Ünvan / görev
            <input
              className="input-light"
              value={profile.jobTitle}
              onChange={(event) => updateProfile({ jobTitle: event.target.value })}
              placeholder="Örn. Operasyon müdürü"
            />
          </label>
          <label className="label-light account-form-span-2">
            Cep telefonu
            <input
              className="input-light"
              type="tel"
              value={profile.phone}
              onChange={(event) => updateProfile({ phone: event.target.value })}
              placeholder="+90 5xx xxx xx xx"
            />
          </label>
          <label className="label-light account-form-span-2">
            Birincil e-posta (salt okunur)
            <input
              className="input-light"
              value={emailAddress}
              readOnly
              aria-readonly="true"
            />
          </label>
        </div>
        {saveMessage ? <p className="account-save-hint">{saveMessage}</p> : null}
        <p className="account-meta-line">
          Kullanıcı kimliği: <code>{userId || "—"}</code>
        </p>
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Dil ve bölge</h2>
            <p className="account-card-lead">
              Platform arayüzü ve e-posta özetleri için tercih edilen dil. Üst menüdeki
              dil seçici ile senkron kalır.
            </p>
          </div>
        </header>
        <label className="label-light account-profile-locale">
          Arayüz dili
          <select
            className="input-light"
            value={profile.interfaceLocale || locale}
            onChange={(event) => handleLocaleChange(event.target.value)}
          >
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
            <option value="uk">Українська</option>
            <option value="ru">Русский</option>
          </select>
        </label>
      </section>
      </div>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Bildirimler</h2>
            <p className="account-card-lead">
              Hangi olaylarda e-posta veya uygulama içi uyarı alacağınızı seçin.
            </p>
          </div>
        </header>
        <div className="account-corridor-toggles account-notification-toggles">
          <button
            type="button"
            className={
              profile.notifyNewOffers
                ? "account-corridor-chip active"
                : "account-corridor-chip"
            }
            aria-pressed={profile.notifyNewOffers}
            onClick={() => toggleNotification("notifyNewOffers")}
          >
            <span>Yeni teklif / ilan</span>
          </button>
          <button
            type="button"
            className={
              profile.notifyMessages
                ? "account-corridor-chip active"
                : "account-corridor-chip"
            }
            aria-pressed={profile.notifyMessages}
            onClick={() => toggleNotification("notifyMessages")}
          >
            <span>Mesajlar</span>
          </button>
          <button
            type="button"
            className={
              profile.notifyAuctions
                ? "account-corridor-chip active"
                : "account-corridor-chip"
            }
            aria-pressed={profile.notifyAuctions}
            onClick={() => toggleNotification("notifyAuctions")}
          >
            <span>İhaleler</span>
          </button>
          <button
            type="button"
            className={
              profile.notifyWeeklyDigest
                ? "account-corridor-chip active"
                : "account-corridor-chip"
            }
            aria-pressed={profile.notifyWeeklyDigest}
            onClick={() => toggleNotification("notifyWeeklyDigest")}
          >
            <span>Haftalık özet</span>
          </button>
        </div>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Güvenlik</h2>
            <p className="account-card-lead">
              Şifre ve oturum yönetimi. Kurumsal hesaplarda ek doğrulama organizasyon
              sekmesinden yapılır.
            </p>
          </div>
          <Link href="/hesap/organizasyon" className="btn-account-ghost">
            Kurumsal doğrulama
          </Link>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Yeni şifre
            <input
              className="input-light"
              type="password"
              disabled
              placeholder="Yakında — API ile güncellenecek"
            />
          </label>
          <label className="label-light">
            Şifre tekrar
            <input
              className="input-light"
              type="password"
              disabled
              placeholder="Yakında — API ile güncellenecek"
            />
          </label>
        </div>
        <p className="module-hint account-security-hint">
          Şifre değişimi ve iki adımlı doğrulama sonraki sürümde eklenecek. Şüpheli
          erişimde oturumu kapatın ve destek ile iletişime geçin.
        </p>
        <div className="account-security-actions">
          <button type="button" className="btn-account-ghost" onClick={() => logout()}>
            Tüm cihazlarda çıkış (bu oturum)
          </button>
          <Link href="/iletisim" className="btn-account-primary">
            Destek
          </Link>
        </div>
      </section>
    </div>
  );
}
