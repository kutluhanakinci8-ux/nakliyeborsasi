"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  fetchMailInboxBranding,
  updateMailEmailSocialLinks,
  type MailEmailSocialLink,
  type MailEmailSocialPlatform,
} from "@/lib/mailApi";

const PLATFORMS: {
  id: MailEmailSocialPlatform;
  label: string;
  placeholder: string;
  markClass: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    placeholder: "@firma veya https://instagram.com/…",
    markClass: "mail-social-mark--instagram",
  },
  {
    id: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/…",
    markClass: "mail-social-mark--facebook",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/…",
    markClass: "mail-social-mark--linkedin",
  },
  {
    id: "x",
    label: "X",
    placeholder: "@firma veya https://x.com/…",
    markClass: "mail-social-mark--x",
  },
  {
    id: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@…",
    markClass: "mail-social-mark--youtube",
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "@firma veya https://tiktok.com/@…",
    markClass: "mail-social-mark--tiktok",
  },
  {
    id: "website",
    label: "Web sitesi",
    placeholder: "https://firma.com",
    markClass: "mail-social-mark--website",
  },
];

type Props = {
  accessToken: string;
  canEdit: boolean;
};

export function MailEmailSocialLinksEditor({ accessToken, canEdit }: Props) {
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
        setError("Sosyal bağlantılar yüklenemedi.");
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
      setError("Kaydetmek için en az bir sosyal medya adresi girin.");
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
          "Kayıt boş kaldı. Tam https adresi veya @kullaniciadi deneyin.",
        );
        return;
      }
      setStatus(
        saved > 0
          ? `${saved} bağlantı kaydedildi — giden posta alt bilgisinde görünür.`
          : "Sosyal bağlantılar temizlendi.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kaydedilemedi. Adresler https veya @kullaniciadi olmalı.",
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
              <span
                className={`mail-social-mark ${platform.markClass}`}
                aria-hidden="true"
              />
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
          Düzenlemek için kurumsal posta yöneticisi yetkisi gerekir.
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
        <button
          type="submit"
          className="mail-premium-btn mail-premium-btn--primary"
          disabled={saving}
        >
          {saving ? "Kaydediliyor…" : "Sosyal bağlantıları kaydet"}
        </button>
      ) : null}
    </form>
  );
}
