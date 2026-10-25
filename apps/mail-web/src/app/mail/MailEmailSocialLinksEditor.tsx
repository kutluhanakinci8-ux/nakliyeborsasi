"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MailSocialPlatformIcon } from "@/components/MailSocialPlatformIcon";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  fetchMailInboxBranding,
  updateMailEmailSocialLinks,
  type MailEmailSocialLink,
  type MailEmailSocialPlatform,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  canEdit: boolean;
};

export function MailEmailSocialLinksEditor({ accessToken, canEdit }: Props) {
  const { t } = useMailLocale();
  const PLATFORMS = useMemo(
    () => [
      { id: "instagram" as const, label: "Instagram", placeholder: t("socialPhInstagram") },
      { id: "facebook" as const, label: "Facebook", placeholder: t("socialPhFacebook") },
      { id: "linkedin" as const, label: "LinkedIn", placeholder: t("socialPhLinkedin") },
      { id: "x" as const, label: "X", placeholder: t("socialPhX") },
      { id: "youtube" as const, label: "YouTube", placeholder: t("socialPhYoutube") },
      { id: "tiktok" as const, label: "TikTok", placeholder: t("socialPhTiktok") },
      { id: "website" as const, label: t("socialWebsite"), placeholder: t("socialPhWebsite") },
    ],
    [t],
  );
  const [values, setValues] = useState<Record<MailEmailSocialPlatform, string>>(
    () =>
      Object.fromEntries(
        PLATFORMS.map((p) => [p.id, ""]),
      ) as Record<MailEmailSocialPlatform, string>,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const { branding } = await fetchMailInboxBranding(accessToken);
        const next = Object.fromEntries(
          PLATFORMS.map((p) => [p.id, ""]),
        ) as Record<MailEmailSocialPlatform, string>;
        for (const link of branding.emailSocialLinks ?? []) {
          next[link.platform] = link.url;
        }
        setValues(next);
      } catch {
        setError(t("socialErrLoad"));
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
    setError("");
    setStatus("");
    setSaving(true);
    const emailSocialLinks: MailEmailSocialLink[] = [];
    for (const platform of PLATFORMS) {
      const raw = values[platform.id].trim();
      if (raw) {
        emailSocialLinks.push({ platform: platform.id, url: raw });
      }
    }
    if (emailSocialLinks.length === 0) {
      setError(t("socialErrMinOne"));
      setSaving(false);
      return;
    }
    try {
      const { branding } = await updateMailEmailSocialLinks(
        accessToken,
        emailSocialLinks,
      );
      const saved = branding.emailSocialLinks?.length ?? 0;
      if (emailSocialLinks.length > 0 && saved === 0) {
        setError(
          t("socialErrEmptySave"),
        );
        return;
      }
      setStatus(
        saved > 0
          ? t("socialSavedCount", { count: saved })
          : t("socialCleared"),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("socialErrSaveFormat"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mail-social-skeleton" aria-busy="true">
        {PLATFORMS.slice(0, 4).map((p) => (
          <div key={p.id} className="mail-social-skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <form className="mail-social-form" onSubmit={(e) => void onSubmit(e)}>
      <div className="mail-social-form-grid">
        {PLATFORMS.map((platform) => (
          <label key={platform.id} className="mail-social-field">
            <span className="mail-social-field-label">
              <MailSocialPlatformIcon platform={platform.id} />
              {platform.label}
            </span>
            <input
              className="mail-premium-input"
              type="text"
              inputMode="url"
              value={values[platform.id]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [platform.id]: e.target.value,
                }))
              }
              placeholder={platform.placeholder}
              disabled={!canEdit}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {!canEdit ? (
        <p className="mail-accounts-muted">
          {t("socialNeedAdmin")}
        </p>
      ) : null}
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
      {canEdit ? (
        <div className="mail-social-form-actions">
          <button
            type="submit"
            className="mail-premium-btn mail-premium-btn--primary mail-social-save-btn"
            disabled={saving}
          >
            {saving ? t("actionSaving") : t("socialSave")}
          </button>
        </div>
      ) : null}
    </form>
  );
}
