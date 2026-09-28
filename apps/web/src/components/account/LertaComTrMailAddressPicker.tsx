"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  claimCompanyMailAddress,
  formatMailIdentityApiError,
} from "../../lib/CompanyMailIdentityApi";
import {
  fetchLertaComTrLocalPartAvailability,
  fetchLertaComTrMailSuggestions,
  isLocalPartFormatValid,
  suggestLocalPartsClientSide,
} from "../../lib/lertaComTrMailOnboarding";

type LertaComTrMailAddressPickerProps = {
  accessToken: string;
  companyLegalName: string;
  displayNameDefault?: string;
  onSuccess: (fromAddress: string) => void;
  compact?: boolean;
};

export function LertaComTrMailAddressPicker({
  accessToken,
  companyLegalName,
  displayNameDefault = "",
  onSuccess,
  compact = false,
}: LertaComTrMailAddressPickerProps) {
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState(displayNameDefault);
  const [tenantDomain, setTenantDomain] = useState("lerta.com.tr");
  const [platformDnsReady, setPlatformDnsReady] = useState(true);
  const [availability, setAvailability] = useState<
    "unknown" | "checking" | "ok" | "taken" | "invalid"
  >("unknown");
  const [availabilityHint, setAvailabilityHint] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fullPreview = useMemo(() => {
    const lp = localPart.trim().toLowerCase();
    if (!lp) {
      return `…@${tenantDomain}`;
    }
    return `${lp}@${tenantDomain}`;
  }, [localPart, tenantDomain]);

  const loadSuggestions = useCallback(async () => {
    const fallback = suggestLocalPartsClientSide(companyLegalName);
    setSuggestions(fallback);
    try {
      const remote = await fetchLertaComTrMailSuggestions(
        accessToken,
        companyLegalName,
      );
      setTenantDomain(remote.tenantDomain);
      setPlatformDnsReady(remote.platformDnsReady);
      const parts = remote.candidates.map((c) => c.localPart);
      if (parts.length > 0) {
        setSuggestions(parts);
        const firstFree =
          remote.candidates.find((c) => c.available)?.localPart ??
          parts[0];
        setLocalPart((prev) => prev || firstFree);
      }
    } catch {
      setLocalPart((prev) => prev || fallback[0] || "");
    }
  }, [accessToken, companyLegalName]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (!displayName && displayNameDefault) {
      setDisplayName(displayNameDefault);
    }
  }, [displayName, displayNameDefault]);

  useEffect(() => {
    const lp = localPart.trim().toLowerCase();
    if (!lp) {
      setAvailability("unknown");
      setAvailabilityHint("");
      return;
    }
    if (!isLocalPartFormatValid(lp)) {
      setAvailability("invalid");
      setAvailabilityHint(
        "3–50 karakter; küçük harf, rakam ve tire. Rezerve ön ekler kullanılamaz.",
      );
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setAvailability("checking");
        try {
          const result = await fetchLertaComTrLocalPartAvailability(
            accessToken,
            lp,
          );
          setTenantDomain(result.tenantDomain);
          if (!result.valid) {
            setAvailability("invalid");
            setAvailabilityHint(result.reasonTr ?? "Geçersiz ön ek.");
            return;
          }
          if (!result.available) {
            setAvailability("taken");
            setAvailabilityHint(
              result.reasonTr ?? "Bu adres kullanımda; başka bir ön ek deneyin.",
            );
            return;
          }
          setAvailability("ok");
          setAvailabilityHint("Bu adres kullanılabilir.");
        } catch {
          setAvailability("unknown");
          setAvailabilityHint("");
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accessToken, localPart]);

  async function handleClaim(): Promise<void> {
    setError("");
    const lp = localPart.trim().toLowerCase();
    if (!isLocalPartFormatValid(lp)) {
      setError("Geçerli bir adres ön eki girin.");
      return;
    }
    setBusy(true);
    try {
      const result = await claimCompanyMailAddress(accessToken, {
        desiredAddress: `${lp}@${tenantDomain}`,
        displayName: displayName.trim() || companyLegalName,
      });
      onSuccess(result.fromAddress);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(raw ? formatMailIdentityApiError(raw) : "Adres oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "account-form-row"}>
      {!compact ? (
        <>
          <p className="account-verify-eyebrow">Lerta kurumsal posta</p>
          <p className="account-card-lead">
            Platform giriş e-postanız (üyelik) ile{" "}
            <strong>posta kutusu adresiniz</strong> farklıdır. Burada seçtiğiniz
            adres gelen/giden kurumsal posta için kullanılır:{" "}
            <code>önek@lerta.com.tr</code>.
          </p>
        </>
      ) : null}

      {!platformDnsReady ? (
        <p className="module-hint" style={{ marginBottom: "0.75rem" }}>
          Platform MX kaydı henüz tam değil; kutu oluşturulur, dışarıdan gelen
          posta DNS yayına alındığında açılır.
        </p>
      ) : null}

      <label className="account-label">
        Posta adresi ön eki
        <div className="auth-mail-local-row" style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            className="account-input"
            value={localPart}
            onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
            placeholder="kutluhanlogistics"
            autoComplete="off"
            spellCheck={false}
            style={{ flex: 1 }}
          />
          <span className="module-hint" style={{ whiteSpace: "nowrap" }}>
            @{tenantDomain}
          </span>
        </div>
      </label>
      <p className="module-hint">
        Önizleme: <code>{fullPreview}</code>
        {availability === "checking" ? " · kontrol ediliyor…" : null}
        {availability === "ok" ? (
          <span style={{ color: "var(--status-ok, #059669)" }}>
            {" "}
            · {availabilityHint}
          </span>
        ) : null}
        {availability === "taken" || availability === "invalid" ? (
          <span className="error"> · {availabilityHint}</span>
        ) : null}
      </p>

      {suggestions.length > 1 ? (
        <p className="module-hint">
          Öneriler:{" "}
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="btn-account-secondary"
              style={{ marginRight: "0.35rem", marginTop: "0.25rem" }}
              onClick={() => setLocalPart(s)}
            >
              {s}
            </button>
          ))}
        </p>
      ) : null}

      <label className="account-label">
        Görünen ad (alıcıların gördüğü başlık)
        <input
          className="account-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={companyLegalName}
        />
      </label>

      {error ? <p className="error">{error}</p> : null}

      <button
        type="button"
        className="btn-account-primary"
        disabled={
          busy ||
          availability === "taken" ||
          availability === "invalid" ||
          !localPart.trim()
        }
        onClick={() => void handleClaim()}
      >
        {busy ? "Oluşturuluyor…" : "Posta adresini oluştur"}
      </button>
    </div>
  );
}
