"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  resolveAccountDisplayName,
  resolveAccountInitials,
} from "../../../../lib/accountNavigation";
import { ProfileSectionNav } from "../../../../components/account/ProfileSectionNav";
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

const LOCALE_OPTIONS = [
  { code: "tr", label: "Türkçe", region: "TR · UA koridoru" },
  { code: "en", label: "English", region: "Global UI" },
  { code: "uk", label: "Українська", region: "UA" },
  { code: "ru", label: "Русский", region: "CIS" },
] as const;

const NOTIFICATION_OPTIONS: {
  key: keyof Pick<
    UserProfile,
    "notifyNewOffers" | "notifyMessages" | "notifyAuctions" | "notifyWeeklyDigest"
  >;
  title: string;
  description: string;
}[] = [
  {
    key: "notifyNewOffers",
    title: "Yeni teklif ve ilan",
    description: "Marketplace ve atanmış yüklerde anlık uyarı.",
  },
  {
    key: "notifyMessages",
    title: "Mesajlar",
    description: "Taşıyıcı ve gönderici sohbetleri.",
  },
  {
    key: "notifyAuctions",
    title: "İhaleler",
    description: "Açık artırma, süre uzatma ve kazanan bildirimi.",
  },
  {
    key: "notifyWeeklyDigest",
    title: "Haftalık özet",
    description: "KPI ve koridor özeti — e-posta.",
  },
];

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
  const { session, locale, setLocale, logout } = useWebSession();
  const userId = session?.userId ?? "";
  const emailAddress = session?.emailAddress ?? "";
  const [profile, setProfile] = useState<UserProfile>(() =>
    defaultProfile(emailAddress),
  );
  const [saveMessage, setSaveMessage] = useState("");

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

  function handleLocaleSelect(nextLocale: string): void {
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
  const displayName = profile.fullName || resolveAccountDisplayName(emailAddress);
  const activeLocale = profile.interfaceLocale || locale;

  return (
    <div className="account-profile-page account-profile-page--premium-v2">
      <header className="account-profile-hero" aria-label="Kişisel hesap özeti">
        <div className="account-profile-hero-backdrop" aria-hidden />
        <div className="account-profile-hero-inner">
          <div className="account-profile-hero-identity">
            <div className="account-profile-avatar-wrap">
              <span className="account-profile-avatar account-profile-avatar--xl" aria-hidden>
                {initials}
              </span>
              <span className="account-profile-avatar-status" title="Oturum aktif" />
            </div>
            <div>
              <p className="account-profile-hero-kicker">Kişisel hesap</p>
              <h1 className="account-profile-hero-name">{displayName}</h1>
              {profile.jobTitle ? (
                <p className="account-profile-hero-title">{profile.jobTitle}</p>
              ) : null}
              <p className="account-profile-hero-email">{emailAddress || "—"}</p>
              <div className="account-profile-hero-badges">
                {roles.length === 0 ? (
                  <span className="account-profile-pill">Rol atanmadı</span>
                ) : (
                  roles.map((role) => (
                    <span key={role} className="account-profile-pill account-profile-pill--accent">
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="account-profile-hero-metrics">
            <div className="account-profile-metric">
              <span className="account-profile-metric-value">{activeLocale.toUpperCase()}</span>
              <span className="account-profile-metric-label">Arayüz dili</span>
            </div>
            <div className="account-profile-metric">
              <span className="account-profile-metric-value account-profile-metric-value--ok">
                Aktif
              </span>
              <span className="account-profile-metric-label">Oturum</span>
            </div>
            <div className="account-profile-metric account-profile-metric--wide">
              <span className="account-profile-metric-value account-profile-metric-value--mono">
                {userId ? `${userId.slice(0, 8)}…` : "—"}
              </span>
              <span className="account-profile-metric-label">Kullanıcı kimliği</span>
            </div>
          </div>
        </div>
      </header>

      <div className="account-profile-shortcuts" aria-label="İlgili hesap alanları">
        <Link href="/hesap/organizasyon" className="account-profile-shortcut">
          <span className="account-profile-shortcut-icon" aria-hidden>◎</span>
          <span className="account-profile-shortcut-copy">
            <strong>Kurumsal hesap</strong>
            <span>Doğrulama, koridorlar ve abonelik planı</span>
          </span>
          <span className="account-profile-shortcut-chevron" aria-hidden>→</span>
        </Link>
        <Link href="/hesap/odemeler" className="account-profile-shortcut">
          <span className="account-profile-shortcut-icon" aria-hidden>€</span>
          <span className="account-profile-shortcut-copy">
            <strong>Ödemeler</strong>
            <span>Fatura bilgileri ve tahsilat geçmişi</span>
          </span>
          <span className="account-profile-shortcut-chevron" aria-hidden>→</span>
        </Link>
      </div>

      <div className="account-profile-layout">
        <ProfileSectionNav />
        <main className="account-profile-main">
          <form
            id="profile-identity"
            className="account-profile-panel module-panel module-panel--elevated"
            onSubmit={handlePersonalSubmit}
          >
            <header className="account-profile-panel-head">
              <div>
                <p className="account-profile-panel-kicker">01 · Kimlik</p>
                <h2 className="account-profile-panel-title">Kişisel bilgiler</h2>
                <p className="account-profile-panel-lead">
                  Ekip içi görünürlük ve bildirimler için. Giriş e-postası değiştirilemez.
                </p>
              </div>
              <button type="submit" className="btn-account-primary account-profile-save">
                Kaydet
              </button>
            </header>
            <div className="account-profile-field-grid account-profile-field-grid--compact">
              <label className="account-profile-field account-profile-field--inline">
                <span className="account-profile-field-label">Görünen ad</span>
                <input
                  className="account-profile-input"
                  value={profile.fullName}
                  onChange={(event) => updateProfile({ fullName: event.target.value })}
                  placeholder="Ad Soyad"
                />
              </label>
              <label className="account-profile-field account-profile-field--inline">
                <span className="account-profile-field-label">Ünvan / görev</span>
                <input
                  className="account-profile-input"
                  value={profile.jobTitle}
                  onChange={(event) => updateProfile({ jobTitle: event.target.value })}
                  placeholder="Örn. Operasyon müdürü"
                />
              </label>
              <label className="account-profile-field account-profile-field--inline">
                <span className="account-profile-field-label">Cep telefonu</span>
                <input
                  className="account-profile-input"
                  type="tel"
                  value={profile.phone}
                  onChange={(event) => updateProfile({ phone: event.target.value })}
                  placeholder="+90 5xx xxx xx xx"
                />
              </label>
              <label className="account-profile-field account-profile-field--inline">
                <span className="account-profile-field-label">Birincil e-posta</span>
                <input
                  className="account-profile-input account-profile-input--readonly"
                  value={emailAddress}
                  readOnly
                  aria-readonly="true"
                />
              </label>
            </div>
            {saveMessage ? (
              <p className="account-profile-toast" role="status">{saveMessage}</p>
            ) : null}
          </form>

          <section
            id="profile-locale"
            className="account-profile-panel module-panel module-panel--elevated account-profile-section"
          >
            <header className="account-profile-panel-head">
              <div>
                <p className="account-profile-panel-kicker">02 · Bölge</p>
                <h2 className="account-profile-panel-title">Dil ve bölge</h2>
                <p className="account-profile-panel-lead">
                  Arayüz ve e-posta özetleri. Üst menü dil seçici ile senkron.
                </p>
              </div>
            </header>
            <div className="account-profile-locale-grid" role="radiogroup" aria-label="Arayüz dili">
              {LOCALE_OPTIONS.map((option) => {
                const selected = activeLocale === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={
                      selected
                        ? "account-profile-locale-card account-profile-locale-card--active"
                        : "account-profile-locale-card"
                    }
                    onClick={() => handleLocaleSelect(option.code)}
                  >
                    <span className="account-profile-locale-code">{option.code.toUpperCase()}</span>
                    <span className="account-profile-locale-name">{option.label}</span>
                    <span className="account-profile-locale-region">{option.region}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            id="profile-notify"
            className="account-profile-panel module-panel module-panel--elevated account-profile-section"
          >
            <header className="account-profile-panel-head">
              <div>
                <p className="account-profile-panel-kicker">03 · Uyarılar</p>
                <h2 className="account-profile-panel-title">Bildirimler</h2>
                <p className="account-profile-panel-lead">
                  Kişisel tercihleriniz; firma geneli kurallar organizasyon sekmesinde.
                </p>
              </div>
            </header>
            <ul className="account-profile-toggle-list">
              {NOTIFICATION_OPTIONS.map((item) => {
                const on = profile[item.key];
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="account-profile-toggle-row"
                      aria-pressed={on}
                      onClick={() => toggleNotification(item.key)}
                    >
                      <span className="account-profile-toggle-copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                      <span
                        className={
                          on
                            ? "account-profile-switch account-profile-switch--on"
                            : "account-profile-switch"
                        }
                        aria-hidden
                      >
                        <span className="account-profile-switch-knob" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            id="profile-security"
            className="account-profile-panel module-panel module-panel--elevated account-profile-section"
          >
            <header className="account-profile-panel-head">
              <div>
                <p className="account-profile-panel-kicker">04 · Güvenlik</p>
                <h2 className="account-profile-panel-title">Oturum ve erişim</h2>
                <p className="account-profile-panel-lead">
                  Şifre ve MFA yakında. Kurumsal belgeler organizasyon doğrulamasında.
                </p>
              </div>
              <Link
                href="/hesap/organizasyon#org-dogrulama"
                className="btn-account-ghost"
              >
                Kurumsal doğrulama
              </Link>
            </header>
            <div className="account-profile-security-banner">
              <span className="account-profile-security-icon" aria-hidden />
              <div>
                <strong>Bu oturum güvende</strong>
                <p>
                  Şüpheli erişimde çıkış yapın. İki adımlı doğrulama bir sonraki sürümde
                  etkinleştirilebilir.
                </p>
              </div>
            </div>
            <div className="account-profile-field-grid">
              <label className="account-profile-field">
                <span className="account-profile-field-label">Yeni şifre</span>
                <input
                  className="account-profile-input account-profile-input--readonly"
                  type="password"
                  disabled
                  placeholder="Yakında — API"
                />
              </label>
              <label className="account-profile-field">
                <span className="account-profile-field-label">Şifre tekrar</span>
                <input
                  className="account-profile-input account-profile-input--readonly"
                  type="password"
                  disabled
                  placeholder="Yakında — API"
                />
              </label>
            </div>
            <div className="account-profile-security-actions">
              <button type="button" className="btn-account-ghost" onClick={() => logout()}>
                Bu oturumu sonlandır
              </button>
              <Link href="/iletisim" className="btn-account-primary">
                Güvenlik desteği
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
