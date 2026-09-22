"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  CORRIDOR_OPTIONS,
  documentStatusLabel,
  loadOrganizationAdminSettings,
  loadOrganizationProfile,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "../../../../lib/organizationProfile";
import { useWebSession } from "../../../../context/WebSessionProvider";

export function OrganizationPageClient() {
  const { session } = useWebSession();
  const companyId = session?.companyId ?? "";
  const emailAddress = session?.emailAddress ?? "";
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    loadOrganizationProfile(companyId, emailAddress),
  );
  const [adminSettings, setAdminSettings] = useState(() =>
    loadOrganizationAdminSettings(companyId),
  );
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!companyId) {
      return;
    }
    setProfile(loadOrganizationProfile(companyId, emailAddress));
    setAdminSettings(loadOrganizationAdminSettings(companyId));
  }, [companyId, emailAddress]);

  function persistProfile(next: OrganizationProfile): void {
    if (!companyId) {
      return;
    }
    saveOrganizationProfile(companyId, next);
    setSaveMessage("Değişiklikler kaydedildi (demo — tarayıcıda saklanır).");
    window.setTimeout(() => setSaveMessage(""), 4000);
  }

  function toggleCorridor(code: string): void {
    setProfile((current) => {
      const has = current.corridors.includes(code);
      const corridors = has
        ? current.corridors.filter((item) => item !== code)
        : [...current.corridors, code];
      const next = { ...current, corridors };
      persistProfile(next);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    persistProfile(profile);
  }

  function updateProfile(patch: Partial<OrganizationProfile>): void {
    setProfile((current) => ({ ...current, ...patch }));
  }

  const corridorDisplay = profile.corridors.join(" · ") || "—";
  const displayEmail = profile.primaryEmail || emailAddress;

  if (adminSettings.accountFrozen) {
    return (
      <section className="account-card module-panel module-panel--elevated">
        <h2 className="account-card-title">Hesap geçici olarak askıda</h2>
        <p className="account-card-lead">
          Kurumsal profil platform yöneticisi tarafından donduruldu. Destek ile
          iletişime geçin.
        </p>
        <Link href="/iletisim" className="btn-account-primary">Destek</Link>
      </section>
    );
  }

  return (
    <>
      <section className="account-verify-banner module-panel module-panel--elevated">
        <div className="account-verify-copy">
          <p className="account-verify-eyebrow">Güven ve doğrulama</p>
          <h2 className="account-card-title">Kurumsal doğrulama</h2>
          <p className="account-card-lead">
            Tam doğrulama ile ilanlarınızda rozet, öncelikli arama ve ihale
            katılımı açılır. Kimlik ve firma belgeleri tek seferde yüklenir.
          </p>
          <div className="account-verify-badges">
            {adminSettings.emailVerified ? (
              <span className="account-status-pill account-status-pill--ok">
                E-posta onaylı
              </span>
            ) : (
              <span className="account-status-pill account-status-pill--pending">
                E-posta bekleniyor
              </span>
            )}
            <span
              className={
                adminSettings.documentStatus === "approved"
                  ? "account-status-pill account-status-pill--ok"
                  : "account-status-pill account-status-pill--pending"
              }
            >
              {documentStatusLabel(adminSettings.documentStatus)}
            </span>
            {adminSettings.verificationLevel === "full" ? (
              <span className="account-status-pill account-status-pill--ok">
                Tam doğrulama
              </span>
            ) : null}
            {adminSettings.featuredInSearch ? (
              <span className="account-status-pill account-status-pill--ok">
                Öne çıkan arama
              </span>
            ) : null}
          </div>
          <div className="account-verify-actions">
            <button type="button" className="btn-account-primary">
              Doğrulamayı başlat
            </button>
            <Link href="/iletisim" className="btn-account-ghost">
              Destek ile görüş
            </Link>
          </div>
        </div>
        <div className="account-verify-aside" aria-hidden>
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">{corridorDisplay}</span>
            <span className="account-verify-stat-label">Koridor odağı</span>
          </div>
          <div className="account-verify-stat">
            <span className="account-verify-stat-value">
              {session?.roleCodes?.length ?? 0}
            </span>
            <span className="account-verify-stat-label">Aktif rol</span>
          </div>
        </div>
      </section>

      <form className="account-card module-panel module-panel--elevated" onSubmit={handleSubmit}>
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Temel bilgiler</h2>
            <p className="account-card-lead">
              Ticari unvan ve vergi bilgileri sözleşme ve fatura için kullanılır.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Kaydet</button>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Ticari unvan
            <input
              className="input-light"
              value={profile.tradeName}
              onChange={(event) => updateProfile({ tradeName: event.target.value })}
              required
            />
          </label>
          <label className="label-light">
            Resmi unvan
            <input
              className="input-light"
              value={profile.legalName}
              onChange={(event) =>
                updateProfile({ legalName: event.target.value })
              }
            />
          </label>
          <label className="label-light">
            Vergi / TIN numarası
            <input
              className="input-light"
              value={profile.taxNumber}
              onChange={(event) =>
                updateProfile({ taxNumber: event.target.value })
              }
            />
          </label>
          <label className="label-light">
            Ülke kodu
            <select
              className="input-light"
              value={profile.countryCode}
              onChange={(event) =>
                updateProfile({ countryCode: event.target.value })
              }
            >
              <option value="TR">TR — Türkiye</option>
              <option value="UA">UA — Ukrayna</option>
              <option value="PL">PL — Polonya</option>
              <option value="DE">DE — Almanya</option>
              <option value="RO">RO — Romanya</option>
            </select>
          </label>
          <label className="label-light account-form-span-2">
            Şehir / merkez ofis
            <input
              className="input-light"
              value={profile.city}
              onChange={(event) =>
                updateProfile({ city: event.target.value })
              }
            />
          </label>
        </div>
        {saveMessage ? <p className="account-save-hint">{saveMessage}</p> : null}
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Koridor yetkileri</h2>
            <p className="account-card-lead">
              Hangi hatlarda ilan verebileceğinizi ve arama sonuçlarında görüneceğinizi seçin.
            </p>
          </div>
        </header>
        {!adminSettings.allowNewListings ? (
          <p className="module-hint">Yeni ilan oluşturma platform yöneticisi tarafından kapatıldı.</p>
        ) : null}
        <div className="account-corridor-toggles">
          {CORRIDOR_OPTIONS.map((corridor) => {
            const active = profile.corridors.includes(corridor.code);
            return (
              <button
                key={corridor.code}
                type="button"
                className={
                  active ? "account-corridor-chip active" : "account-corridor-chip"
                }
                onClick={() => toggleCorridor(corridor.code)}
                aria-pressed={active}
                disabled={!adminSettings.allowNewListings}
              >
                <span className="account-corridor-code">{corridor.code}</span>
                <span>{corridor.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Birincil iletişim</h2>
            <p className="account-card-lead">
              Giriş e-postası ve operasyon telefonu — teklif bildirimleri bu kanallara gider.
            </p>
          </div>
          <Link href="/hesap/profil" className="btn-account-ghost">
            Profilde düzenle
          </Link>
        </header>
        <ul className="account-contact-list">
          <li>
            <span className="account-contact-icon" aria-hidden>@</span>
            <div>
              <span className="account-contact-label">Birincil e-posta</span>
              <strong>{displayEmail || "—"}</strong>
            </div>
          </li>
          <li>
            <span className="account-contact-icon" aria-hidden>☎</span>
            <div>
              <span className="account-contact-label">Operasyon telefonu</span>
              <input
                className="input-light account-contact-input"
                type="tel"
                placeholder="+90 5xx xxx xx xx"
                value={profile.phone}
                onChange={(event) =>
                  updateProfile({ phone: event.target.value })
                }
              />
            </div>
          </li>
          <li>
            <span className="account-contact-icon" aria-hidden>⌁</span>
            <div>
              <span className="account-contact-label">Web sitesi</span>
              <input
                className="input-light account-contact-input"
                type="url"
                placeholder="https://"
                value={profile.website}
                onChange={(event) =>
                  updateProfile({ website: event.target.value })
                }
              />
            </div>
          </li>
        </ul>
        <p className="account-meta-line">
          Firma kimliği (sistem): <code>{companyId || "—"}</code>
        </p>
      </section>
    </>
  );
}
