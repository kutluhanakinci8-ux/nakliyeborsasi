"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  fetchMailInboxBranding,
  updateMailEmailSocialLinks,
  type MailEmailSocialLink,
  type MailEmailSocialPlatform,
} from "@/lib/mailApi";

const PLATFORMS: { id: MailEmailSocialPlatform; label: string; placeholder: string }[] =
  [
    {
      id: "instagram",
      label: "Instagram",
      placeholder: "@firma veya https://instagram.com/…",
    },
    {
      id: "facebook",
      label: "Facebook",
      placeholder: "https://facebook.com/…",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      placeholder: "https://linkedin.com/company/…",
    },
    { id: "x", label: "X (Twitter)", placeholder: "@firma veya https://x.com/…" },
    {
      id: "youtube",
      label: "YouTube",
      placeholder: "https://youtube.com/@…",
    },
    {
      id: "tiktok",
      label: "TikTok",
      placeholder: "@firma veya https://tiktok.com/@…",
    },
    {
      id: "website",
      label: "Web sitesi",
      placeholder: "https://firma.com",
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
          ? `${saved} bağlantı kaydedildi. Önizleme ve giden postada alt kısımda görünür.`
          : "Sosyal bağlantılar temizlendi.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kaydedilemedi. Adresler https veya @kullaniciadi (Instagram, X, TikTok) olmalı.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mail-settings-muted">Yükleniyor…</p>;
  }

  return (
    <form className="mail-email-social-form" onSubmit={(e) => void onSubmit(e)}>
      <p className="mail-settings-lead">
        Gönderdiğiniz e-postaların altında tıklanabilir sosyal medya ikonları
        görünür (alıcı önizlemesinde de yer alır).
      </p>
      {PLATFORMS.map((platform) => (
        <label key={platform.id} className="mail-settings-field">
          <span>{platform.label}</span>
          <input
            className="mail-settings-input"
            type="text"
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
      {!canEdit ? (
        <p className="mail-settings-muted">
          Düzenlemek için kurumsal posta yöneticisi yetkisi gerekir.
        </p>
      ) : null}
      {error ? <p className="mail-settings-error">{error}</p> : null}
      {status ? <p className="mail-settings-ok">{status}</p> : null}
      {canEdit ? (
        <button
          type="submit"
          className="mail-settings-btn-primary"
          disabled={saving}
        >
          {saving ? "Kaydediliyor…" : "Sosyal bağlantıları kaydet"}
        </button>
      ) : null}
    </form>
  );
}
