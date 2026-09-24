"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REGISTRATION_COUNTRY_OPTIONS, countryFlagEmoji } from "../../../../lib/countryDisplay";
import {
  CORRIDOR_OPTIONS,
  documentStatusLabel,
  loadOrganizationAdminSettings,
  loadOrganizationProfile,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "../../../../lib/organizationProfile";
import {
  enrichOrganizationFromWebsite,
  getPendingWebsiteEnrichmentUrl,
  runPendingWebsiteEnrichment,
} from "../../../../lib/websiteEnrichmentWorkflow";
import { useWebSession } from "../../../../context/WebSessionProvider";
import { OrganizationSectionNav } from "../../../../components/account/OrganizationSectionNav";
import { CompanySubscriptionPanel } from "../../../../components/account/CompanySubscriptionPanel";

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

  async function rescanWebsite(): Promise<void> {
    const url = profile.website.trim();
    if (!companyId || !url) {
      setSaveMessage("Önce bir web sitesi adresi girin.");
      window.setTimeout(() => setSaveMessage(""), 5000);
      return;
    }
    setIsEnrichingWebsite(true);
    setSaveMessage("Web sitesi yeniden taranıyor…");
    const outcome = await enrichOrganizationFromWebsite(
      companyId,
      emailAddress,
      url,
    );
    setIsEnrichingWebsite(false);
    if (outcome === "success") {
      setProfile(loadOrganizationProfile(companyId, emailAddress));
      setSaveMessage("Tarama tamamlandı; yeni alanlar güncellendi.");
    } else {
      setSaveMessage("Tarama başarısız. Adresi kontrol edip tekrar deneyin.");
    }
    window.setTimeout(() => setSaveMessage(""), 8000);
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

  const displayTradeName =
    profile.tradeName || profile.legalName || "Kurumsal hesabınız";

  return (
    <div className="account-org-page">
      <header
        id="org-ozet"
        className="account-org-hero module-panel module-panel--elevated account-org-section"
      >
        <div className="account-org-hero-main">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt=""
              className="account-org-logo"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="account-org-logo account-org-logo--placeholder" aria-hidden>
              {profile.tradeName?.slice(0, 2).toUpperCase() || "NB"}
            </span>
          )}
          <div>
            <p className="account-org-hero-kicker">Kurumsal hesap</p>
            <h1 className="account-org-hero-title">{displayTradeName}</h1>
          </div>
        </div>
      </header>

      <div className="account-org-layout">
        <OrganizationSectionNav />
        <div className="account-org-main">
      <section
        id="org-dogrulama"
        className="account-verify-banner module-panel module-panel--elevated account-org-section"
      >
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
        id="org-temel"
        className="account-card module-panel module-panel--elevated account-org-section"
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
                updateProfile({ countryCode: event.target.value.toUpperCase() })
              }
            >
              {REGISTRATION_COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {countryFlagEmoji(country.code)} {country.code} — {country.labelTr}
                </option>
              ))}
              {profile.countryCode &&
              !REGISTRATION_COUNTRY_OPTIONS.some(
                (c) => c.code === profile.countryCode,
              ) ? (
                <option value={profile.countryCode}>
                  {countryFlagEmoji(profile.countryCode)} {profile.countryCode}
                </option>
              ) : null}
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

      <section
        id="org-web"
        className="account-card module-panel module-panel--elevated account-org-section"
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Web sitesinden alınan bilgiler</h2>
            <p className="account-card-lead">
              Kayıt sonrası otomatik tarama ile doldurulur; gerekirse düzenleyip tekrar
              kaydedin.
            </p>
          </div>
          <div className="account-card-head-actions">
            <button
              type="button"
              className="btn-account-ghost"
              disabled={isEnrichingWebsite}
              onClick={() => void rescanWebsite()}
            >
              Web sitesini yeniden tara
            </button>
            <button
              type="button"
              className="btn-account-ghost"
              onClick={() => persistProfile(profile)}
            >
              Bu bölümü kaydet
            </button>
          </div>
        </header>
        <div className="account-form-grid">
          <div className="account-logo-field account-form-span-2">
            <p className="label-light">Şirket logosu</p>
            <div className="account-logo-preview-row">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt="Firma logosu"
                  className="account-logo-preview"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="account-logo-placeholder" aria-hidden>
                  Logo
                </div>
              )}
              <label className="label-light account-logo-url">
                Logo adresi (URL)
                <input
                  className="input-light"
                  name="nb-logo-url"
                  autoComplete="off"
                  value={profile.logoUrl}
                  onChange={(event) =>
                    updateProfile({ logoUrl: event.target.value })
                  }
                  placeholder="Web sitesinden otomatik"
                />
              </label>
            </div>
          </div>
          <label className="label-light account-form-span-2">
            Firma tanımı (web / meta)
            <textarea
              className="input-light account-textarea"
              name="nb-company-description"
              autoComplete="off"
              rows={2}
              value={profile.companyDescription}
              onChange={(event) =>
                updateProfile({ companyDescription: event.target.value })
              }
              placeholder="Ana sayfa veya meta açıklaması"
            />
          </label>
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
          <label className="label-light">
            Çalışma saatleri
            <input
              className="input-light"
              name="nb-working-hours"
              autoComplete="off"
              value={profile.workingHours}
              onChange={(event) =>
                updateProfile({ workingHours: event.target.value })
              }
              placeholder="Örn. her gün 09:00 - 18:00"
            />
          </label>
          <p className="account-form-subheading account-form-span-2">
            Resmi kayıt ve uyum
          </p>
          <label className="label-light">
            MERSİS numarası
            <input
              className="input-light"
              name="nb-mersis"
              autoComplete="off"
              value={profile.mersisNumber}
              onChange={(event) =>
                updateProfile({ mersisNumber: event.target.value })
              }
            />
          </label>
          <label className="label-light">
            Vergi dairesi / no (satır)
            <input
              className="input-light"
              name="nb-tax-office"
              autoComplete="off"
              value={profile.taxOfficeLine}
              onChange={(event) =>
                updateProfile({ taxOfficeLine: event.target.value })
              }
              placeholder="Örn. Sultanbeyli 3340524157"
            />
          </label>
          <label className="label-light">
            Ticaret sicil no
            <input
              className="input-light"
              name="nb-trade-registry"
              autoComplete="off"
              value={profile.tradeRegistryNumber}
              onChange={(event) =>
                updateProfile({ tradeRegistryNumber: event.target.value })
              }
            />
          </label>
          <label className="label-light">
            Ulaştırma yetki belge no
            <input
              className="input-light"
              name="nb-transport-license"
              autoComplete="off"
              value={profile.transportLicenseNumber}
              onChange={(event) =>
                updateProfile({ transportLicenseNumber: event.target.value })
              }
            />
          </label>
          <label className="label-light account-form-span-2">
            KEP adresi
            <input
              className="input-light"
              name="nb-kep"
              autoComplete="off"
              value={profile.kepAddress}
              onChange={(event) =>
                updateProfile({ kepAddress: event.target.value })
              }
              placeholder="ornek@hs01.kep.tr"
            />
          </label>
          <p className="account-form-subheading account-form-span-2">
            Sosyal medya
          </p>
          <label className="label-light">
            Facebook
            <input
              className="input-light"
              name="nb-social-facebook"
              autoComplete="off"
              inputMode="url"
              value={profile.facebookUrl}
              onChange={(event) =>
                updateProfile({ facebookUrl: event.target.value })
              }
              placeholder="https://www.facebook.com/…"
            />
          </label>
          <label className="label-light">
            Instagram
            <input
              className="input-light"
              name="nb-social-instagram"
              autoComplete="off"
              inputMode="url"
              value={profile.instagramUrl}
              onChange={(event) =>
                updateProfile({ instagramUrl: event.target.value })
              }
              placeholder="https://www.instagram.com/…"
            />
          </label>
          <label className="label-light">
            X (Twitter)
            <input
              className="input-light"
              name="nb-social-twitter"
              autoComplete="off"
              inputMode="url"
              value={profile.twitterUrl}
              onChange={(event) =>
                updateProfile({ twitterUrl: event.target.value })
              }
              placeholder="https://twitter.com/…"
            />
          </label>
          <label className="label-light">
            YouTube
            <input
              className="input-light"
              name="nb-social-youtube"
              autoComplete="off"
              inputMode="url"
              value={profile.youtubeUrl}
              onChange={(event) =>
                updateProfile({ youtubeUrl: event.target.value })
              }
              placeholder="https://www.youtube.com/…"
            />
          </label>
          <label className="label-light account-form-span-2">
            LinkedIn
            <input
              className="input-light"
              name="nb-social-linkedin"
              autoComplete="off"
              inputMode="url"
              value={profile.linkedinUrl}
              onChange={(event) =>
                updateProfile({ linkedinUrl: event.target.value })
              }
              placeholder="https://www.linkedin.com/company/…"
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
        {profile.websiteScannedUrls ? (
          <p className="account-meta-line account-meta-line--wrap">
            Taranan sayfalar:{" "}
            <code>{profile.websiteScannedUrls.replace(/\n/g, " · ")}</code>
          </p>
        ) : null}
        {profile.websiteEnrichmentCompletedAt ? (
          <p className="account-meta-line">
            Son otomatik tarama:{" "}
            {new Date(profile.websiteEnrichmentCompletedAt).toLocaleString("tr-TR")}
          </p>
        ) : null}
      </section>

      <section
        id="org-koridor"
        className="account-card module-panel module-panel--elevated account-org-section"
      >
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

      <section
        id="org-iletisim"
        className="account-card module-panel module-panel--elevated account-org-section"
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Birincil iletişim</h2>
            <p className="account-card-lead">
              Firma düzeyinde operasyon kanalları — teklif ve ihale bildirimleri buraya gider.
              Giriş e-postanız kişisel profilde salt okunur.
            </p>
          </div>
          <Link href="/hesap/profil" className="btn-account-ghost">
            Kişisel profil
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
                placeholder="0850 veya sabit hat"
                value={profile.phone}
                onChange={(event) =>
                  updateProfile({ phone: event.target.value })
                }
              />
            </div>
          </li>
          <li>
            <span className="account-contact-icon" aria-hidden>
              WA
            </span>
            <div>
              <span className="account-contact-label">WhatsApp</span>
              <input
                className="input-light account-contact-input"
                type="tel"
                name="nb-whatsapp-primary"
                autoComplete="off"
                placeholder="Web sitesindeki WhatsApp hattı"
                value={profile.whatsappNumber}
                onChange={(event) =>
                  updateProfile({ whatsappNumber: event.target.value })
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

      <CompanySubscriptionPanel />

        </div>
      </div>
    </div>
  );
}
