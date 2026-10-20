"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  fetchMailBranding,
  updateMailEmailSocialLinks,
  type MailEmailSocialLink,
} from "@/lib/consoleApi";

const FIELDS: { platform: MailEmailSocialLink["platform"]; label: string }[] = [
  { platform: "instagram", label: "Instagram" },
  { platform: "facebook", label: "Facebook" },
  { platform: "linkedin", label: "LinkedIn" },
  { platform: "x", label: "X" },
  { platform: "youtube", label: "YouTube" },
  { platform: "tiktok", label: "TikTok" },
  { platform: "website", label: "Web sitesi" },
];

type Props = {
  accessToken: string;
};

export function MailEmailSocialLinksForm({ accessToken }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchMailBranding(accessToken)
      .then((data) => {
        const next: Record<string, string> = {};
        for (const link of data.branding.emailSocialLinks ?? []) {
          next[link.platform] = link.url;
        }
        setValues(next);
      })
      .catch(() => setError("Sosyal bağlantılar yüklenemedi."));
  }, [accessToken]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const emailSocialLinks: MailEmailSocialLink[] = [];
    for (const field of FIELDS) {
      const url = (values[field.platform] ?? "").trim();
      if (url) {
        emailSocialLinks.push({ platform: field.platform, url });
      }
    }
    try {
      await updateMailEmailSocialLinks(accessToken, emailSocialLinks);
      setMessage("Kaydedildi.");
    } catch {
      setError("Geçersiz adres. https veya @kullanıcı adı kullanın.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" style={{ marginTop: 16 }} onSubmit={onSubmit}>
      <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
        E-posta alt bilgisi — sosyal medya
      </h2>
      <p style={{ color: "var(--muted)", margin: "0 0 12px" }}>
        Giden e-postaların altında tıklanabilir ikonlar görünür (tüm planlar).
      </p>
      {FIELDS.map((field) => (
        <label key={field.platform} style={{ display: "block", marginBottom: 12 }}>
          {field.label}
          <input
            className="input"
            style={{ width: "100%", marginTop: 4 }}
            value={values[field.platform] ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                [field.platform]: e.target.value,
              }))
            }
            placeholder={
              field.platform === "website"
                ? "https://firma.com"
                : "@firma veya tam URL"
            }
          />
        </label>
      ))}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {message ? <p style={{ color: "var(--success)" }}>{message}</p> : null}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Kaydediliyor…" : "Sosyal bağlantıları kaydet"}
      </button>
    </form>
  );
}
