"use client";

import { useEffect, useState } from "react";
import type { MailInboxListDensity } from "@/lib/mailApi";
import { updateInboxPreferences } from "@/lib/mailApi";
import {
  applyMailThemeMode,
  ensureSystemThemeListener,
  getSystemPrefersDark,
  initMailTheme,
  MAIL_THEME_MODE_CHANGE_EVENT,
  mailThemeModeLabel,
  readStoredThemeMode,
  resolveEffectiveTheme,
  type MailThemeMode,
} from "@/lib/mailTheme";
import {
  applyReadFontScale,
  initReadFontScale,
  type MailReadFontScale,
} from "@/lib/mailDisplayPrefs";

type Props = {
  accessToken: string;
  inboxListDensity: MailInboxListDensity;
  onInboxListDensityChange?: (density: MailInboxListDensity) => void;
};

const THEME_OPTIONS: {
  id: MailThemeMode;
  label: string;
  hint: string;
  previewClass: string;
}[] = [
  {
    id: "light",
    label: "Açık",
    hint: "Gündüz, aydınlık ortam",
    previewClass: "mail-display-theme-preview--light",
  },
  {
    id: "dark",
    label: "Koyu",
    hint: "Gece, düşük ışık",
    previewClass: "mail-display-theme-preview--dark",
  },
  {
    id: "system",
    label: "Sistem",
    hint: "Windows / macOS teması",
    previewClass: "mail-display-theme-preview--system",
  },
];

export function MailDisplaySettings({
  accessToken,
  inboxListDensity,
  onInboxListDensityChange,
}: Props) {
  const [themeMode, setThemeMode] = useState<MailThemeMode>("light");
  const [density, setDensity] = useState(inboxListDensity);
  const [readFont, setReadFont] = useState<MailReadFontScale>("default");
  const [densityStatus, setDensityStatus] = useState("");
  const [densitySaving, setDensitySaving] = useState(false);
  const [osPrefersDark, setOsPrefersDark] = useState(false);

  useEffect(() => {
    setThemeMode(initMailTheme());
    setReadFont(initReadFontScale());
    setOsPrefersDark(getSystemPrefersDark());
    ensureSystemThemeListener();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsTheme = () => setOsPrefersDark(media.matches);
    media.addEventListener("change", onOsTheme);

    const onModeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ mode: MailThemeMode }>).detail;
      const mode = detail?.mode ?? readStoredThemeMode();
      if (mode) {
        setThemeMode(mode);
      }
    };
    window.addEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);

    return () => {
      media.removeEventListener("change", onOsTheme);
      window.removeEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);
    };
  }, []);

  useEffect(() => {
    setDensity(inboxListDensity);
  }, [inboxListDensity]);

  const effectiveTheme = resolveEffectiveTheme(themeMode);
  const osThemeLabel = osPrefersDark ? "Koyu" : "Açık";

  const themeStatusMessage = (() => {
    if (themeMode === "system") {
      const effectiveLabel = mailThemeModeLabel(effectiveTheme);
      if (effectiveTheme === "light") {
        return `Sistem modu seçili. İşletim sisteminiz şu an «${osThemeLabel}» temada; bu yüzden görünüm «Açık» ile aynı. macOS/Windows koyu temaya geçtiğinde Posta otomatik koyulaşır.`;
      }
      return `Sistem modu seçili. İşletim sistemi «${osThemeLabel}» — uygulama şu an «${effectiveLabel}» görünümde ve OS ile senkron kalır.`;
    }
    if (themeMode === "light") {
      return "Sabit açık mod: işletim sistemi teması değişse bile görünüm açık kalır.";
    }
    return "Sabit koyu mod: işletim sistemi teması değişse bile görünüm koyu kalır.";
  })();

  return (
    <div className="mail-display-settings">
      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Renk modu</h3>
        <p className="mail-display-theme-status" role="status">
          {themeStatusMessage}
        </p>
        <div className="mail-display-theme-grid">
          {THEME_OPTIONS.map((option) => {
            const hint =
              option.id === "system"
                ? `Windows / macOS teması · OS: ${osThemeLabel}`
                : option.hint;
            return (
            <button
              key={option.id}
              type="button"
              className={
                themeMode === option.id
                  ? "mail-display-theme-card is-active"
                  : "mail-display-theme-card"
              }
              aria-pressed={themeMode === option.id}
              onClick={() => {
                applyMailThemeMode(option.id);
                setThemeMode(option.id);
              }}
            >
              <span
                className={`mail-display-theme-preview ${option.previewClass}`}
                aria-hidden="true"
              >
                <span className="mail-display-theme-preview-bar" />
                <span className="mail-display-theme-preview-body" />
              </span>
              <span className="mail-display-theme-card-label">{option.label}</span>
              <span className="mail-display-theme-card-hint">{hint}</span>
            </button>
            );
          })}
        </div>
      </section>

      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Gelen kutusu yoğunluğu</h3>
        <div className="mail-display-segment">
          {(
            [
              { id: "comfortable" as MailInboxListDensity, label: "Rahat" },
              { id: "compact" as MailInboxListDensity, label: "Sıkı" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                density === option.id
                  ? "mail-display-segment-btn is-active"
                  : "mail-display-segment-btn"
              }
              onClick={() => setDensity(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {densityStatus ? (
          <p className="mail-display-status">{densityStatus}</p>
        ) : null}
        <button
          type="button"
          className="mail-display-save-btn"
          disabled={densitySaving || density === inboxListDensity}
          onClick={() =>
            void (async () => {
              setDensitySaving(true);
              setDensityStatus("");
              try {
                const result = await updateInboxPreferences(accessToken, {
                  inboxListDensity: density,
                });
                const saved = result.preferences.inboxListDensity;
                setDensity(saved);
                onInboxListDensityChange?.(saved);
                setDensityStatus("Yoğunluk kaydedildi.");
              } catch (error) {
                setDensityStatus(
                  error instanceof Error ? error.message : "Kaydedilemedi.",
                );
              } finally {
                setDensitySaving(false);
              }
            })()
          }
        >
          {densitySaving ? "Kaydediliyor…" : "Yoğunluğu kaydet"}
        </button>
      </section>

      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Okuma alanı</h3>
        <div className="mail-display-segment">
          {(
            [
              { id: "default" as MailReadFontScale, label: "Normal" },
              { id: "large" as MailReadFontScale, label: "Büyük" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                readFont === option.id
                  ? "mail-display-segment-btn is-active"
                  : "mail-display-segment-btn"
              }
              onClick={() => {
                applyReadFontScale(option.id);
                setReadFont(option.id);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <p className="mail-display-section-hint">
        Konuşma görünümü ve geri al gönder süresi{" "}
        <strong>Ayarlar → Posta</strong> altında.
      </p>
    </div>
  );
}
