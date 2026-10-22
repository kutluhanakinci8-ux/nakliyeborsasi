"use client";

import { useEffect, useState } from "react";
import type { MailInboxListDensity } from "@/lib/mailApi";
import { updateInboxPreferences } from "@/lib/mailApi";
import {
  applyMailThemeMode,
  ensureSystemThemeListener,
  initMailTheme,
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
  threadView: boolean;
  onThreadViewChange: (enabled: boolean) => void;
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
  threadView,
  onThreadViewChange,
}: Props) {
  const [themeMode, setThemeMode] = useState<MailThemeMode>("light");
  const [density, setDensity] = useState(inboxListDensity);
  const [readFont, setReadFont] = useState<MailReadFontScale>("default");
  const [densityStatus, setDensityStatus] = useState("");
  const [densitySaving, setDensitySaving] = useState(false);

  useEffect(() => {
    setThemeMode(initMailTheme());
    setReadFont(initReadFontScale());
    ensureSystemThemeListener();
  }, []);

  useEffect(() => {
    setDensity(inboxListDensity);
  }, [inboxListDensity]);

  return (
    <div className="mail-display-settings">
      <p className="mail-display-intro">
        Gmail ve Outlook’taki «Görünüm» benzeri: renk modu, liste yoğunluğu ve
        okuma alanı. Tema ve yazı boyutu tarayıcıda; yoğunluk kurumsal posta
        kutunuzda saklanır.
      </p>

      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Renk modu</h3>
        <p className="mail-display-section-hint">
          Outlook «Koyu mod», Gmail «Temayı ayarla», iCloud «Açık / Koyu /
          Otomatik».
        </p>
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
        <p className="mail-display-section-hint">
          Outlook «Görünüm → Yoğunluk»; Gmail «Görünüm yoğunluğu» (Rahat / Sıkı).
        </p>
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
        <p className="mail-display-section-hint">
          Mesaj gövdesi yazı boyutu (Yahoo / Outlook okuma boyutu benzeri).
        </p>
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

      <section className="mail-display-section">
        <h3 className="mail-display-section-title">Konuşma görünümü</h3>
        <p className="mail-display-section-hint">
          Gmail «Konuşma görünümü» — aynı konudaki iletileri tek satırda grupla.
        </p>
        <label className="mail-display-toggle-row">
          <span>Konuşmaları grupla</span>
          <input
            type="checkbox"
            checked={threadView}
            onChange={(e) => onThreadViewChange(e.target.checked)}
          />
        </label>
      </section>

      <details className="mail-display-compare">
        <summary>Rakiplerde bu sekmede neler var?</summary>
        <ul>
          <li>
            <strong>Gmail:</strong> Açık / Koyu / Sistem, yoğunluk, okuma paneli
            konumu, konuşma görünümü.
          </li>
          <li>
            <strong>Outlook:</strong> Tema, yoğunluk, odaklanmış gelen kutusu,
            okuma bölmesi.
          </li>
          <li>
            <strong>Proton:</strong> Açık / Koyu / Sistem, yoğunluk, e-posta
            birleştirme.
          </li>
          <li>
            <strong>Lerta Posta:</strong> Yukarıdaki seçenler; odaklanmış gelen
            kutusu ve özel arka plan planlanıyor.
          </li>
        </ul>
      </details>
    </div>
  );
}
