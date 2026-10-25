"use client";

import { useCallback, useEffect, useState } from "react";
import type { MailInboxListDensity } from "@/lib/mailApi";
import { updateInboxPreferences } from "@/lib/mailApi";
import {
  applyMailThemeMode,
  ensureSystemThemeListener,
  initMailTheme,
  MAIL_THEME_MODE_CHANGE_EVENT,
  readStoredThemeMode,
  type MailThemeMode,
} from "@/lib/mailTheme";
import {
  applyReadFontScale,
  initReadFontScale,
  MAIL_READ_FONT_SCALE_CHANGE_EVENT,
  readReadFontScale,
  type MailReadFontScale,
} from "@/lib/mailDisplayPrefs";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import type { MailTimeZoneId, MailUiLocale } from "@/lib/mailLocale";

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
  const { locale, setLocale, timeZone, setTimeZone, t } = useMailLocale();
  const [themeMode, setThemeMode] = useState<MailThemeMode>("light");
  const [density, setDensity] = useState(inboxListDensity);
  const [readFont, setReadFont] = useState<MailReadFontScale>("default");
  const [densityStatus, setDensityStatus] = useState("");
  const [densitySaving, setDensitySaving] = useState(false);

  useEffect(() => {
    setThemeMode(initMailTheme());
    setReadFont(initReadFontScale());
    ensureSystemThemeListener();

    const onModeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ mode: MailThemeMode }>).detail;
      const mode = detail?.mode ?? readStoredThemeMode();
      if (mode) {
        setThemeMode(mode);
      }
    };
    window.addEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);

    const onReadFontChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scale: MailReadFontScale }>).detail;
      const scale = detail?.scale ?? readReadFontScale();
      setReadFont(scale);
    };
    window.addEventListener(
      MAIL_READ_FONT_SCALE_CHANGE_EVENT,
      onReadFontChange,
    );

    return () => {
      window.removeEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);
      window.removeEventListener(
        MAIL_READ_FONT_SCALE_CHANGE_EVENT,
        onReadFontChange,
      );
    };
  }, []);

  useEffect(() => {
    setDensity(inboxListDensity);
  }, [inboxListDensity]);

  const persistInboxListDensity = useCallback(
    (next: MailInboxListDensity) => {
      if (next === inboxListDensity || densitySaving) {
        return;
      }
      setDensity(next);
      onInboxListDensityChange?.(next);
      setDensitySaving(true);
      setDensityStatus("");
      void (async () => {
        try {
          const result = await updateInboxPreferences(accessToken, {
            inboxListDensity: next,
          });
          const saved = result.preferences.inboxListDensity;
          setDensity(saved);
          onInboxListDensityChange?.(saved);
          setDensityStatus(
            saved === "compact" ? "Sıkı görünüm uygulandı." : "Rahat görünüm uygulandı.",
          );
        } catch (error) {
          setDensity(inboxListDensity);
          onInboxListDensityChange?.(inboxListDensity);
          setDensityStatus(
            error instanceof Error ? error.message : "Kaydedilemedi.",
          );
        } finally {
          setDensitySaving(false);
        }
      })();
    },
    [
      accessToken,
      densitySaving,
      inboxListDensity,
      onInboxListDensityChange,
    ],
  );

  return (
    <div className="mail-display-settings">
      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Renk modu</h3>
        <div className="mail-display-theme-grid">
          {THEME_OPTIONS.map((option) => (
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
              <span className="mail-display-theme-card-hint">{option.hint}</span>
            </button>
          ))}
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
              disabled={densitySaving}
              onClick={() => persistInboxListDensity(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {densitySaving ? (
          <p className="mail-display-status">Kaydediliyor…</p>
        ) : densityStatus ? (
          <p className="mail-display-status">{densityStatus}</p>
        ) : null}
      </section>

      <section className="mail-display-section">
        <h3 className="mail-display-section-title">{t("regionalTitle")}</h3>
        <p className="mail-display-section-hint">{t("regionalHint")}</p>
        <p className="mail-display-field-label">{t("languageLabel")}</p>
        <div className="mail-display-segment">
          {(
            [
              { id: "tr" as MailUiLocale, label: t("localeTr") },
              { id: "en" as MailUiLocale, label: t("localeEn") },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                locale === option.id
                  ? "mail-display-segment-btn is-active"
                  : "mail-display-segment-btn"
              }
              onClick={() => setLocale(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mail-display-field-label">{t("timeZoneLabel")}</p>
        <select
          className="mail-display-select"
          value={timeZone}
          onChange={(event) =>
            setTimeZone(event.target.value as MailTimeZoneId)
          }
        >
          <option value="Europe/Istanbul">Europe/Istanbul (TR)</option>
          <option value="UTC">UTC</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
        </select>
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
