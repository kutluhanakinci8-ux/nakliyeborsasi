"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nb-cookie-preferences-v1";

type CookiePrefs = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFS: CookiePrefs = {
  functional: true,
  analytics: false,
  marketing: false,
};

type PrefRowProps = {
  id: keyof CookiePrefs | "essential";
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
};

function PrefRow({ id, title, description, checked, disabled, onChange }: PrefRowProps) {
  const inputId = `cookie-pref-${id}`;
  return (
    <div className="cookie-pref-row">
      <div className="cookie-pref-copy">
        <h3 className="cookie-pref-title">{title}</h3>
        <p className="cookie-pref-desc">{description}</p>
      </div>
      <label className={`cookie-switch${disabled ? " cookie-switch--locked" : ""}`} htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span className="cookie-switch-track" aria-hidden />
        <span className="cookie-switch-label">{disabled ? "Zorunlu" : checked ? "Açık" : "Kapalı"}</span>
      </label>
    </div>
  );
}

export function CookieSettingsClient() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CookiePrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed, functional: true });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CookiePrefs) => {
    const withFunctional = { ...next, functional: true };
    setPrefs(withFunctional);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withFunctional));
    setNotice("Tercihleriniz kaydedildi. Oturum çerezleri güvenlik için her zaman etkindir.");
    window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const acceptAll = () => {
    persist({ functional: true, analytics: true, marketing: true });
  };

  const rejectOptional = () => {
    persist({ functional: true, analytics: false, marketing: false });
  };

  const saveCurrent = () => {
    persist(prefs);
  };

  if (!hydrated) {
    return (
      <div className="cookie-prefs-block" aria-label="Çerez tercih paneli">
        <p className="cookie-prefs-loading">Tercih paneli yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="cookie-prefs-block" aria-label="Çerez tercih paneli">
      <div className="cookie-pref-list">
        <PrefRow
          id="essential"
          title="Zorunlu çerezler"
          description="Oturum, güvenlik, yük dengeleme ve temel tercihler. Kapatılamaz."
          checked
          disabled
        />
        <PrefRow
          id="functional"
          title="İşlevsel çerezler"
          description="Dil seçimi, arayüz tercihleri ve son kullanılan modül hatırlama."
          checked={prefs.functional}
          disabled
        />
        <PrefRow
          id="analytics"
          title="Analitik çerezler"
          description="Anonim kullanım istatistikleri; performans ve koridor trafiği analizi."
          checked={prefs.analytics}
          onChange={(next) => setPrefs((current) => ({ ...current, analytics: next }))}
        />
        <PrefRow
          id="marketing"
          title="Pazarlama çerezleri"
          description="Kampanya ve duyuru ölçümü. Varsayılan: kapalı."
          checked={prefs.marketing}
          onChange={(next) => setPrefs((current) => ({ ...current, marketing: next }))}
        />
      </div>

      <div className="cookie-prefs-actions">
        <button type="button" className="legal-btn legal-btn--primary cookie-prefs-btn" onClick={saveCurrent}>
          Seçimleri kaydet
        </button>
        <button type="button" className="legal-btn legal-btn--secondary cookie-prefs-btn" onClick={acceptAll}>
          Tümünü kabul et
        </button>
        <button type="button" className="legal-btn legal-btn--ghost cookie-prefs-btn" onClick={rejectOptional}>
          Zorunlu dışında reddet
        </button>
      </div>

      {notice ? (
        <p className="cookie-prefs-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
