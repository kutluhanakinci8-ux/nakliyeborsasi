"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CORRIDOR_OPTIONS,
  documentStatusLabel,
  loadOrganizationAdminSettings,
  loadOrganizationProfile,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "../../../../lib/organizationProfile";
import {
  getPendingWebsiteEnrichmentUrl,
  runPendingWebsiteEnrichment,
} from "../../../../lib/websiteEnrichmentWorkflow";
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
  const [isEnrichingWebsite, setIsEnrichingWebsite] = useState(false);
  const [pendingWebsiteUrl, setPendingWebsiteUrl] = useState<string | null>(null);
  const enrichmentStartedForCompany = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    setProfile(loadOrganizationProfile(companyId, emailAddress));
    setAdminSettings(loadOrganizationAdminSettings(companyId));
    setPendingWebsiteUrl(getPendingWebsiteEnrichmentUrl(companyId));
  }, [companyId, emailAddress]);

  useEffect(() => {
    if (!companyId || !pendingWebsiteUrl) {
      return;
    }
    if (enrichmentStartedForCompany.current === companyId) {
      return;
    }
    enrichmentStartedForCompany.current = companyId;

    void (async () => {
      setIsEnrichingWebsite(true);
      setSaveMessage("Web sitesi taranıyor, firma bilgileri dolduruluyor…");
      const outcome = await runPendingWebsiteEnrichment(companyId, emailAddress);
      setIsEnrichingWebsite(false);
      setPendingWebsiteUrl(null);
      if (outcome === "success") {
        setProfile(loadOrganizationProfile(companyId, emailAddress));
        setSaveMessage(
          "Web sitesinden alınan bilgiler organizasyon alanlarına işlendi.",
        );
      } else if (outcome === "error") {
        setSaveMessage(
          "Web taraması başarısız. Web sitesi alanını kontrol edip sayfayı yenileyin.",
        );
        enrichmentStartedForCompany.current = null;
      }
      window.setTimeout(() => setSaveMessage(""), 8000);
    })();
  }, [companyId, emailAddress, pendingWebsiteUrl]);

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
      <p className="account-session-banner">
        Oturum: <strong>{emailAddress || "—"}</strong>
        {companyId ? (
          <>
            {" "}
            · Firma kimliği <code>{companyId.slice(0, 8)}…</code>
          </>
        ) : null}
      </p>

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

      {pendingWebsiteUrl ? (
        <p className="account-enrichment-banner module-hint">
          Web adresi kayıtlı: <code>{pendingWebsiteUrl}</code>. Sistem şimdi arka planda
          siteyi tarayıp firma alanlarını dolduruyor…
        </p>
      ) : null}

      <section
        className="account-card module-panel module-panel--elevated"
        data-form-type="organization"
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Temel bilgiler</h2>
            <p className="account-card-lead">
              Ticari unvan ve vergi bilgileri sözleşme ve fatura için kullanılır.
            </p>
          </div>
          <button
            type="button"
            className="btn-account-primary"
            disabled={isEnrichingWebsite}
            onClick={() => persistProfile(profile)}
          >
            Kaydet
          </button>
        </header>
        <div className="account-form-grid">
          <label className="label-light">
            Ticari unvan
            <input
              className="input-light"
              name="nb-trade-name"
              autoComplete="off"
              value={profile.tradeName}
              onChange={(event) => updateProfile({ tradeName: event.target.value })}
              required
            />
          </label>
          <label className="label-light">
            Resmi unvan
            <input
              className="input-light"
              name="nb-legal-name"
              autoComplete="off"
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
              name="nb-tax-number"
              autoComplete="off"
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
              name="nb-country-code"
              autoComplete="off"
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
              name="nb-city"
              autoComplete="off"
              value={profile.city}
              onChange={(event) =>
                updateProfile({ city: event.target.value })
              }
            />
          </label>
        </div>
        {saveMessage ? <p className="account-save-hint">{saveMessage}</p> : null}
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Web sitesinden alınan bilgiler</h2>
            <p className="account-card-lead">
              Kayıt sonrası otomatik tarama ile doldurulur; gerekirse düzenleyip tekrar
              kaydedin.
            </p>
          </div>
          <button
            type="button"
            className="btn-account-ghost"
            onClick={() => persistProfile(profile)}
          >
            Bu bölümü kaydet
          </button>
        </header>
        <div className="account-form-grid">
          <label className="label-light account-form-span-2">
            Açık adres
            <input
              className="input-light"
              name="nb-address-line"
              autoComplete="off"
              value={profile.addressLine}
              onChange={(event) =>
                updateProfile({ addressLine: event.target.value })
              }
              placeholder="Web sitesinden veya manuel"
            />
          </label>
          <label className="label-light account-form-span-2">
            Hizmet alanları (özet)
            <textarea
              className="input-light account-textarea"
              name="nb-services-summary"
              autoComplete="off"
              rows={3}
              value={profile.servicesSummary}
              onChange={(event) =>
                updateProfile({ servicesSummary: event.target.value })
              }
              placeholder="Örn. konteyner, depolama, CFS"
            />
          </label>
        </div>
        {profile.websiteEnrichmentCompletedAt ? (
          <p className="account-meta-line">
            Son otomatik tarama:{" "}
            {new Date(profile.websiteEnrichmentCompletedAt).toLocaleString("tr-TR")}
          </p>
        ) : null}
      </section>

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
                name="nb-phone"
                autoComplete="off"
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
                type="text"
                inputMode="url"
                name="nb-company-website"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
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
