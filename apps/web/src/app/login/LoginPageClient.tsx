"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthApiClient } from "../../lib/AuthApiClient";
import { SessionApiClient } from "../../lib/SessionApiClient";
import { applyRegistrationOrganizationProfile } from "../../lib/organizationProfile";
import { SiteLayout } from "../../components/SiteLayout";
import { useWebSession } from "../../context/WebSessionProvider";

type AuthMode = "login" | "register";

const CORPORATE_VALUE_BLOCKS = [
  {
    title: "Firma doğrulama",
    body: "Kurumsal üyelik, firma unvanı ve koridor bilgisiyle açılır.",
  },
  {
    title: "İlan ve ihale",
    body: "Yük arama, teklif ve açık artırma modülleri tek hesapta.",
  },
  {
    title: "Güven kaydı",
    body: "Mesaj, teklif ve entegrasyon işlemleri denetlenebilir kayıt altında.",
  },
] as const;

const PARTICIPANT_TYPE_OPTIONS: {
  code: "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER";
  label: string;
  hint: string;
}[] = [
  { code: "LOAD_SHIPPER", label: "Yük veren", hint: "Yük ilanı yayınlar" },
  { code: "LOAD_CARRIER", label: "Yük taşıyan", hint: "Kapasite ve filo" },
  { code: "LOAD_SEEKER", label: "Yük arayan", hint: "Marketplace arama" },
];

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken, refreshSession, locale, setLocale, accessToken } =
    useWebSession();

  const initialMode: AuthMode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companyCountryCode, setCompanyCountryCode] = useState("TR");
  const [companyWebsiteUrl, setCompanyWebsiteUrl] = useState("");
  const [companyTradeName, setCompanyTradeName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyTaxNumber, setCompanyTaxNumber] = useState("");
  const [companyServicesSummary, setCompanyServicesSummary] = useState("");
  const [showWebsiteEnrichment, setShowWebsiteEnrichment] = useState(false);
  const [websiteEnrichmentStatus, setWebsiteEnrichmentStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [websiteEnrichmentHint, setWebsiteEnrichmentHint] = useState("");
  const enrichmentRequestId = useRef(0);
  const [companyParticipantTypeCode, setCompanyParticipantTypeCode] = useState<
    "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER"
  >("LOAD_SHIPPER");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (accessToken) {
      router.replace("/marketplace");
    }
  }, [accessToken, router]);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const trimmed = companyWebsiteUrl.trim();
    const looksLikeUrl =
      trimmed.length >= 6 &&
      (trimmed.includes(".") || trimmed.startsWith("http"));
    if (!looksLikeUrl) {
      setShowWebsiteEnrichment(false);
      setWebsiteEnrichmentStatus("idle");
      setWebsiteEnrichmentHint("");
      return;
    }

    setShowWebsiteEnrichment(true);
    const requestId = enrichmentRequestId.current + 1;
    enrichmentRequestId.current = requestId;
    setWebsiteEnrichmentStatus("loading");
    setWebsiteEnrichmentHint("Web sitesi taranıyor…");

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const enrichment = await AuthApiClient.enrichCompanyWebsite(trimmed);
          if (enrichmentRequestId.current !== requestId) {
            return;
          }
          setCompanyLegalName((current) =>
            current.trim() ? current : enrichment.companyLegalName ?? "",
          );
          setCompanyTradeName((current) =>
            current.trim() ? current : enrichment.tradeName ?? "",
          );
          setCompanyAddress((current) =>
            current.trim() ? current : enrichment.addressLine ?? "",
          );
          setCompanyCity((current) =>
            current.trim() ? current : enrichment.city ?? "",
          );
          setCompanyPhone((current) =>
            current.trim() ? current : enrichment.phone ?? "",
          );
          setCompanyTaxNumber((current) =>
            current.trim() ? current : enrichment.taxOrRegistryId ?? "",
          );
          setCompanyServicesSummary((current) =>
            current.trim() ? current : enrichment.servicesSummary ?? "",
          );
          setEmailAddress((current) =>
            current.trim() ? current : enrichment.emailAddress ?? "",
          );
          setWebsiteEnrichmentStatus("success");
          setWebsiteEnrichmentHint(
            "Bilgiler web sitesinden alındı — lütfen kontrol edip düzenleyin.",
          );
        } catch (error) {
          if (enrichmentRequestId.current !== requestId) {
            return;
          }
          setWebsiteEnrichmentStatus("error");
          setWebsiteEnrichmentHint(
            error instanceof Error
              ? error.message
              : "Web sitesi bilgileri alınamadı",
          );
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [companyWebsiteUrl]);

  function switchMode(next: AuthMode): void {
    setAuthMode(next);
    setErrorMessage("");
    const query = next === "register" ? "?mode=register" : "";
    router.replace(`/login${query}`, { scroll: false });
  }

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.login(emailAddress, password);
      setAccessToken(result.accessToken);
      await refreshSession();
      router.replace("/marketplace");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Giriş başarısız");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRegister(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!acceptTerms) {
      setErrorMessage("Devam etmek için kullanım koşullarını onaylayın.");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.register({
        emailAddress,
        password,
        displayName,
        companyLegalName,
        companyCountryCode,
        companyParticipantTypeCode,
        companyWebsiteUrl: companyWebsiteUrl.trim() || undefined,
      });
      setAccessToken(result.accessToken);
      const session = await SessionApiClient.fetchSession(result.accessToken);
      applyRegistrationOrganizationProfile(session.companyId, {
        legalName: companyLegalName,
        tradeName: companyTradeName.trim() || companyLegalName,
        countryCode: companyCountryCode,
        emailAddress,
        website: companyWebsiteUrl.trim(),
        phone: companyPhone,
        city: companyCity,
        taxNumber: companyTaxNumber,
      });
      await refreshSession();
      router.replace("/marketplace");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kayıt başarısız");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SiteLayout headerVariant="public">
      <section
        className={
          authMode === "register"
            ? "auth-page auth-page--corporate auth-page--register"
            : "auth-page auth-page--corporate"
        }
      >
        <div
          className={
            authMode === "register"
              ? "auth-page-grid auth-page-grid--corporate auth-page-grid--stacked"
              : "auth-page-grid auth-page-grid--corporate"
          }
        >
          <div className="auth-promo auth-promo--corporate">
            <p className="auth-promo-badge">Kurumsal üyelik · TR · UA · AB</p>
            <h1>Nakliye Borsası&apos;na güvenli erişim</h1>
            <p className="auth-promo-lead">
              Taşıyıcı ve yük veren firmalar için tek giriş noktası. Mevcut hesabınızla
              giriş yapın veya firma bilgilerinizle yeni kurumsal üyelik oluşturun.
            </p>
            <div className="auth-promo-cards">
              {CORPORATE_VALUE_BLOCKS.map((block) => (
                <article key={block.title} className="auth-promo-card">
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                </article>
              ))}
            </div>
            <ul className="auth-promo-list auth-promo-list--corporate">
              <li>256-bit oturum ve JWT tabanlı kimlik doğrulama</li>
              <li>KVKK ve kullanım koşullarına uyumlu kayıt süreci</li>
              <li>Platform operasyonları için ayrı yönetici girişi</li>
            </ul>
          </div>

          <div className="auth-corporate-shell">
            <div className="auth-tab-bar" role="tablist" aria-label="Üyelik işlemleri">
              <button
                type="button"
                role="tab"
                id="auth-tab-login"
                aria-selected={authMode === "login"}
                aria-controls="auth-panel-login"
                className={
                  authMode === "login" ? "auth-tab auth-tab--active" : "auth-tab"
                }
                onClick={() => switchMode("login")}
              >
                Üye girişi
              </button>
              <button
                type="button"
                role="tab"
                id="auth-tab-register"
                aria-selected={authMode === "register"}
                aria-controls="auth-panel-register"
                className={
                  authMode === "register" ? "auth-tab auth-tab--active" : "auth-tab"
                }
                onClick={() => switchMode("register")}
              >
                Yeni üyelik
              </button>
            </div>

            <div className="auth-card auth-card--light auth-card--corporate">
              {authMode === "login" ? (
                <div
                  id="auth-panel-login"
                  role="tabpanel"
                  aria-labelledby="auth-tab-login"
                >
                  <h2>Mevcut hesap</h2>
                  <p className="auth-card-lead">
                    Kurumsal e-posta ve şifrenizle platforma giriş yapın.
                  </p>
                  <form onSubmit={(event) => void handleLogin(event)}>
                    <label className="label-light">
                      Kurumsal e-posta
                      <input
                        className="input-light"
                        type="email"
                        autoComplete="username"
                        value={emailAddress}
                        onChange={(event) => setEmailAddress(event.target.value)}
                        required
                      />
                    </label>
                    <label className="label-light">
                      Şifre
                      <input
                        className="input-light"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>
                    <label className="label-light">
                      Dil
                      <select
                        className="input-light"
                        value={locale}
                        onChange={(event) => setLocale(event.target.value)}
                      >
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                        <option value="uk">Українська</option>
                        <option value="ru">Русский</option>
                      </select>
                    </label>
                    {errorMessage ? (
                      <p className="error error--light">{errorMessage}</p>
                    ) : null}
                    <button type="submit" className="btn-gold-wide" disabled={isBusy}>
                      {isBusy ? "Giriş yapılıyor…" : "Giriş yap"}
                    </button>
                  </form>
                </div>
              ) : (
                <div
                  id="auth-panel-register"
                  role="tabpanel"
                  aria-labelledby="auth-tab-register"
                >
                  <h2>Yeni kurumsal üyelik</h2>
                  <p className="auth-card-lead">
                    Firma sahibi olarak kayıt olun; hesabınız Starter plan ile açılır.
                  </p>
                  <form onSubmit={(event) => void handleRegister(event)}>
                    <label className="label-light">
                      Ad soyad
                      <input
                        className="input-light"
                        autoComplete="name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        required
                        minLength={2}
                      />
                    </label>
                    <label className="label-light">
                      Firma unvanı
                      <input
                        className="input-light"
                        autoComplete="organization"
                        value={companyLegalName}
                        onChange={(event) => setCompanyLegalName(event.target.value)}
                        required
                        minLength={2}
                      />
                    </label>
                    <fieldset className="auth-participant-field">
                      <legend>Firma rolü</legend>
                      <div className="auth-participant-options">
                        {PARTICIPANT_TYPE_OPTIONS.map((option) => (
                          <label
                            key={option.code}
                            className={
                              companyParticipantTypeCode === option.code
                                ? "auth-participant-option auth-participant-option--active"
                                : "auth-participant-option"
                            }
                          >
                            <input
                              type="radio"
                              name="companyParticipantType"
                              value={option.code}
                              checked={companyParticipantTypeCode === option.code}
                              onChange={() => setCompanyParticipantTypeCode(option.code)}
                            />
                            <span className="auth-participant-option-title">
                              {option.label}
                            </span>
                            <span className="auth-participant-option-hint">
                              {option.hint}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="label-light">
                      Firma ülkesi
                      <select
                        className="input-light"
                        value={companyCountryCode}
                        onChange={(event) => setCompanyCountryCode(event.target.value)}
                      >
                        <option value="TR">Türkiye (TR)</option>
                        <option value="UA">Ukrayna (UA)</option>
                        <option value="DE">Almanya (DE)</option>
                        <option value="PL">Polonya (PL)</option>
                      </select>
                    </label>
                    <div className="auth-contact-fields">
                      <p className="auth-contact-fields-title">İletişim ve erişim</p>
                      <label className="label-light">
                        Web adresi
                        <input
                          className="input-light"
                          type="url"
                          inputMode="url"
                          autoComplete="url"
                          placeholder="https://firma.com"
                          value={companyWebsiteUrl}
                          onChange={(event) => setCompanyWebsiteUrl(event.target.value)}
                        />
                      </label>
                      {showWebsiteEnrichment ? (
                        <div
                          className={
                            websiteEnrichmentStatus === "success"
                              ? "auth-enrichment-panel auth-enrichment-panel--success"
                              : websiteEnrichmentStatus === "error"
                                ? "auth-enrichment-panel auth-enrichment-panel--error"
                                : "auth-enrichment-panel"
                          }
                        >
                          <p className="auth-enrichment-panel-title">
                            Web sitesinden getirilen bilgiler
                          </p>
                          <p className="auth-enrichment-panel-hint">
                            {websiteEnrichmentHint}
                          </p>
                          <label className="label-light">
                            Ticari ünvan
                            <input
                              className="input-light"
                              value={companyTradeName}
                              onChange={(event) =>
                                setCompanyTradeName(event.target.value)
                              }
                              placeholder="Web sitesinden"
                            />
                          </label>
                          <label className="label-light">
                            Açık adres
                            <input
                              className="input-light"
                              value={companyAddress}
                              onChange={(event) =>
                                setCompanyAddress(event.target.value)
                              }
                              placeholder="Mahalle, cadde, il"
                            />
                          </label>
                          <div className="auth-enrichment-row">
                            <label className="label-light">
                              Şehir / il
                              <input
                                className="input-light"
                                value={companyCity}
                                onChange={(event) =>
                                  setCompanyCity(event.target.value)
                                }
                              />
                            </label>
                            <label className="label-light">
                              Telefon
                              <input
                                className="input-light"
                                type="tel"
                                value={companyPhone}
                                onChange={(event) =>
                                  setCompanyPhone(event.target.value)
                                }
                              />
                            </label>
                          </div>
                          <label className="label-light">
                            MERSİS / vergi kayıt no
                            <input
                              className="input-light"
                              value={companyTaxNumber}
                              onChange={(event) =>
                                setCompanyTaxNumber(event.target.value)
                              }
                            />
                          </label>
                          <label className="label-light">
                            Hizmet alanları (özet)
                            <textarea
                              className="input-light auth-enrichment-textarea"
                              rows={2}
                              value={companyServicesSummary}
                              onChange={(event) =>
                                setCompanyServicesSummary(event.target.value)
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      <label className="label-light">
                        Kurumsal e-posta
                        <input
                          className="input-light"
                          type="email"
                          autoComplete="email"
                          value={emailAddress}
                          onChange={(event) => setEmailAddress(event.target.value)}
                          required
                        />
                      </label>
                      <label className="label-light">
                        Şifre
                      <input
                        className="input-light"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={8}
                      />
                      </label>
                    </div>
                    <label className="auth-terms">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(event) => setAcceptTerms(event.target.checked)}
                      />
                      <span>
                        <Link href="/kullanim-kosullari">Kullanım koşullarını</Link> ve{" "}
                        <Link href="/kisisel-verilerin-korunmasi">KVKK metnini</Link> okudum,
                        onaylıyorum.
                      </span>
                    </label>
                    {errorMessage ? (
                      <p className="error error--light">{errorMessage}</p>
                    ) : null}
                    <button type="submit" className="btn-gold-wide" disabled={isBusy}>
                      {isBusy ? "Kayıt oluşturuluyor…" : "Üyeliği oluştur"}
                    </button>
                  </form>
                </div>
              )}

              <details className="auth-demo-details">
                <summary>Demo ve test hesapları</summary>
                <p>
                  Demo: <code>demo@nakliyeborsasi.local</code> / DemoPass123! · Test:
                  yukveren01@test… · TestPass123! · Platform yönetimi:{" "}
                  <Link href="/admin/login">/admin/login</Link>
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
