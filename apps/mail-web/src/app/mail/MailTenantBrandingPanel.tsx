"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMailInboxBranding,
  updateMailInboxBranding,
  type MailInboxBranding,
} from "@/lib/mailApi";
import { resolveMailConsoleUrl } from "@/lib/mailApi";
import type { LertaPostalAddressPayload } from "@nakliyeborsasi/core";
import {
  formatPostalAddress,
  formatPostalAddressForDirections,
} from "@/lib/mailAddressFormat";
import {
  buildBrandingLegalFooterForSave,
  parseBrandingLegalFooter,
} from "@/lib/mailPostalLegalFooter";
import { openDirectionsTo } from "@/lib/mailExternalOpenPrefs";

type Props = {
  accessToken: string;
  canEdit: boolean;
  onBrandingSaved?: (branding: MailInboxBranding) => void;
};

const EMPTY_POSTAL: LertaPostalAddressPayload = {
  countryCode: "TR",
  houseNumber: "",
  road: "",
  city: "",
  postcode: "",
  state: "",
};

export function MailTenantBrandingPanel({
  accessToken,
  canEdit,
  onBrandingSaved,
}: Props) {
  const { t } = useMailLocale();
  const [branding, setBranding] = useState<MailInboxBranding | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [emailBrandTitle, setEmailBrandTitle] = useState("");
  const [emailAccentColor, setEmailAccentColor] = useState("#1a1647");
  const [legalNotes, setLegalNotes] = useState("");
  const [postal, setPostal] = useState<LertaPostalAddressPayload>(EMPTY_POSTAL);
  const [defaultFromDisplayName, setDefaultFromDisplayName] = useState("");
  const [hidePlatformEmailChrome, setHidePlatformEmailChrome] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const postalPreview = useMemo(
    () =>
      formatPostalAddress(postal, { abbreviate: false, appendCountry: true }),
    [postal],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMailInboxBranding(accessToken);
      setBranding(data.branding);
      setLogoUrl(data.branding.logoUrl ?? "");
      setEmailBrandTitle(data.branding.emailBrandTitle ?? "");
      setEmailAccentColor(data.branding.emailAccentColor ?? "#1a1647");
      const parsed = parseBrandingLegalFooter(data.branding.emailLegalFooter);
      setLegalNotes(parsed.legalNotes);
      setPostal(parsed.postal ?? { ...EMPTY_POSTAL });
      setDefaultFromDisplayName(data.branding.defaultFromDisplayName ?? "");
      setHidePlatformEmailChrome(data.branding.hidePlatformEmailChrome ?? false);
    } catch {
      setError(t("brandingErrLoad"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function patchPostal(patch: Partial<LertaPostalAddressPayload>) {
    setPostal((prev) => ({ ...prev, ...patch }));
  }

  async function onSave() {
    if (!canEdit || !branding?.allowed) {
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const emailLegalFooter = buildBrandingLegalFooterForSave(legalNotes, postal);
      const data = await updateMailInboxBranding(accessToken, {
        logoUrl: logoUrl.trim() || null,
        emailBrandTitle: emailBrandTitle.trim() || null,
        emailAccentColor: emailAccentColor.trim() || null,
        emailLegalFooter,
        defaultFromDisplayName: defaultFromDisplayName.trim() || null,
        hidePlatformEmailChrome: branding.fullWhiteLabel
          ? hidePlatformEmailChrome
          : false,
      });
      setBranding(data.branding);
      onBrandingSaved?.(data.branding);
      setStatus(t("brandingSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericSave"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mail-posta-skeleton" aria-busy="true">
        <div className="mail-posta-skeleton-card" />
      </div>
    );
  }

  if (!branding?.allowed) {
    return (
      <p className="mail-accounts-muted">
        {branding?.detailTr ?? t("brandingPlanClosed")}{" "}
        <a href={resolveMailConsoleUrl("/upgrade")} target="_blank" rel="noreferrer">
          {t("brandingUpgrade")}
        </a>
      </p>
    );
  }

  return (
    <div className="mail-tenant-branding-form">
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}

      <label className="mail-premium-field">
        <span className="mail-premium-field-label">{t("brandingLogoLabel")}</span>
        <input
          className="mail-premium-field-input"
          value={logoUrl}
          disabled={!canEdit}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder={t("brandingLogoPlaceholder")}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">{t("brandingTitleLabel")}</span>
        <input
          className="mail-premium-field-input"
          value={emailBrandTitle}
          disabled={!canEdit}
          onChange={(e) => setEmailBrandTitle(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">{t("brandingColorLabel")}</span>
        <input
          className="mail-premium-field-input"
          type="color"
          value={emailAccentColor.startsWith("#") ? emailAccentColor : "#1a1647"}
          disabled={!canEdit}
          onChange={(e) => setEmailAccentColor(e.target.value)}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">{t("brandingFromNameLabel")}</span>
        <input
          className="mail-premium-field-input"
          value={defaultFromDisplayName}
          disabled={!canEdit}
          onChange={(e) => setDefaultFromDisplayName(e.target.value)}
          maxLength={120}
        />
      </label>

      <fieldset className="mail-tenant-branding-postal" disabled={!canEdit}>
        <legend className="mail-premium-field-label">{t("brandingPostalTitle")}</legend>
        <p className="mail-accounts-muted">{t("brandingPostalHint")}</p>
        <div className="mail-tenant-branding-postal-grid">
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("brandingPostalCountry")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.countryCode}
              maxLength={2}
              onChange={(e) =>
                patchPostal({ countryCode: e.target.value.toUpperCase() })
              }
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("brandingPostalHouse")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.houseNumber ?? ""}
              onChange={(e) => patchPostal({ houseNumber: e.target.value })}
            />
          </label>
          <label className="mail-premium-field mail-tenant-branding-postal-road">
            <span className="mail-premium-field-label">{t("brandingPostalRoad")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.road ?? ""}
              onChange={(e) => patchPostal({ road: e.target.value })}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("brandingPostalCity")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.city ?? ""}
              onChange={(e) => patchPostal({ city: e.target.value })}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("brandingPostalPostcode")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.postcode ?? ""}
              onChange={(e) => patchPostal({ postcode: e.target.value })}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">{t("brandingPostalState")}</span>
            <input
              className="mail-premium-field-input"
              value={postal.state ?? ""}
              onChange={(e) => patchPostal({ state: e.target.value })}
            />
          </label>
        </div>
        {postalPreview ? (
          <div className="mail-tenant-branding-postal-preview">
            <span className="mail-premium-field-label">{t("brandingPostalPreview")}</span>
            <pre className="mail-oss-license-text">{postalPreview}</pre>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              onClick={() =>
                openDirectionsTo(formatPostalAddressForDirections(postal))
              }
            >
              {t("brandingPostalDirections")}
            </button>
          </div>
        ) : null}
      </fieldset>

      <label className="mail-premium-field">
        <span className="mail-premium-field-label">{t("brandingLegalLabel")}</span>
        <textarea
          className="mail-premium-field-input mail-tenant-branding-legal"
          value={legalNotes}
          disabled={!canEdit}
          onChange={(e) => setLegalNotes(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </label>

      {branding.fullWhiteLabel ? (
        <label className="mail-posta-toggle">
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={hidePlatformEmailChrome}
            disabled={!canEdit}
            onChange={(e) => setHidePlatformEmailChrome(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">{t("brandingHideChrome")}</span>
            <span className="mail-posta-toggle-hint">
              {t("brandingHideChromeHint")}
            </span>
          </span>
        </label>
      ) : (
        <p className="mail-accounts-muted">
          {t("brandingEnterpriseHint")}
        </p>
      )}

      {canEdit ? (
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary"
          disabled={busy}
          onClick={() => void onSave()}
        >
          {busy ? t("actionSaving") : t("actionSave")}
        </button>
      ) : null}
    </div>
  );
}
