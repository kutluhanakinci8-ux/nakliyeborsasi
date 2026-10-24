"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchInboxPreferences,
  updateInboxPreferences,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onEnabledChange?: (enabled: boolean) => void;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function isScheduleActive(
  enabled: boolean,
  activeFrom: string,
  activeUntil: string,
): boolean {
  if (!enabled) {
    return false;
  }
  const now = Date.now();
  if (activeFrom) {
    const from = new Date(activeFrom).getTime();
    if (!Number.isNaN(from) && now < from) {
      return false;
    }
  }
  if (activeUntil) {
    const until = new Date(activeUntil).getTime();
    if (!Number.isNaN(until) && now > until) {
      return false;
    }
  }
  return true;
}

export function MailAutoReplySettingsPanel({
  accessToken,
  onEnabledChange,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const prefs = await fetchInboxPreferences(accessToken);
    const p = prefs.preferences;
    setEnabled(p.autoReplyEnabled);
    onEnabledChange?.(p.autoReplyEnabled);
    setBodyText(p.autoReplyBodyText ?? "");
    setActiveFrom(toDatetimeLocalValue(p.autoReplyActiveFrom));
    setActiveUntil(toDatetimeLocalValue(p.autoReplyActiveUntil));
  }, [accessToken, onEnabledChange]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      setError("");
      try {
        await reload();
      } catch {
        setError("Otomatik yanıt ayarları yüklenemedi.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  const liveNow = useMemo(
    () => isScheduleActive(enabled, activeFrom, activeUntil),
    [enabled, activeFrom, activeUntil],
  );

  async function onSave() {
    setError("");
    setStatus("");
    if (enabled && !bodyText.trim()) {
      setError("Açıkken mesaj metni gerekli.");
      return;
    }
    setSaving(true);
    try {
      await updateInboxPreferences(accessToken, {
        autoReplyEnabled: enabled,
        autoReplyBodyText: bodyText.trim() || null,
        autoReplyActiveFrom: fromDatetimeLocalValue(activeFrom),
        autoReplyActiveUntil: fromDatetimeLocalValue(activeUntil),
      });
      onEnabledChange?.(enabled);
      setStatus("Ayarlar kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="mail-autoreply-panel mail-autoreply-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-autoreply-panel mail-autoreply-panel--premium">
      <p className="mail-posta-intro">
        Gelen postaya otomatik yanıt gönderin (Outlook «Otomatik yanıtlar»). Aynı
        gönderene 24 saatte en fazla bir yanıt verilir; spam ve kurumsal adreslere
        gönderilmez.
      </p>

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

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-autoreply-card-head">
          <div>
            <h3 className="mail-posta-card-title">Otomatik yanıt</h3>
            <p className="mail-posta-card-desc">
              Açık olduğunda gelen mesajlara tanımlı metin gönderilir.
            </p>
          </div>
          {enabled ? (
            <span
              className={
                liveNow
                  ? "mail-autoreply-pill mail-autoreply-pill--live"
                  : "mail-autoreply-pill"
              }
            >
              {liveNow ? "Şu an aktif" : "Açık (zaman dışı)"}
            </span>
          ) : (
            <span className="mail-autoreply-pill mail-autoreply-pill--off">
              Kapalı
            </span>
          )}
        </header>
        <label className="mail-posta-toggle">
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">Otomatik yanıt açık</span>
            <span className="mail-posta-toggle-hint">
              Kapatıldığında yeni gelen postaya yanıt gönderilmez.
            </span>
          </span>
        </label>
      </section>

      <section
        className={
          enabled
            ? "mail-posta-card"
            : "mail-posta-card mail-posta-card--muted mail-autoreply-card--disabled"
        }
        aria-disabled={!enabled}
      >
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Mesaj metni</h3>
          <p className="mail-posta-card-desc">
            Alıcıların göreceği düz metin (en fazla 4000 karakter).
          </p>
        </header>
        <label className="mail-premium-field">
          <span className="mail-premium-field-label">Yanıt metni</span>
          <textarea
            className="mail-premium-field-textarea"
            rows={6}
            maxLength={4000}
            disabled={!enabled}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Örn: 15–22 Eylül arasında ofis dışındayım. Acil durumlarda …"
          />
          <span className="mail-autoreply-char-count" aria-live="polite">
            {bodyText.length} / 4000
          </span>
        </label>
      </section>

      <section
        className={
          enabled
            ? "mail-posta-card"
            : "mail-posta-card mail-posta-card--muted mail-autoreply-card--disabled"
        }
      >
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Zaman aralığı</h3>
          <p className="mail-posta-card-desc">
            Boş bırakırsanız yanıt sürekli açık kalır; tarih seçerek tatil veya
            toplantı dönemini sınırlayabilirsiniz.
          </p>
        </header>
        <div className="mail-autoreply-schedule">
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">Başlangıç (isteğe bağlı)</span>
            <input
              type="datetime-local"
              className="mail-premium-field-input mail-premium-field-input--datetime"
              disabled={!enabled}
              value={activeFrom}
              onChange={(e) => setActiveFrom(e.target.value)}
            />
          </label>
          <label className="mail-premium-field">
            <span className="mail-premium-field-label">Bitiş (isteğe bağlı)</span>
            <input
              type="datetime-local"
              className="mail-premium-field-input mail-premium-field-input--datetime"
              disabled={!enabled}
              value={activeUntil}
              onChange={(e) => setActiveUntil(e.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="mail-autoreply-actions">
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
