"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchInboxPreferences,
  fetchMailPushConfig,
  updateInboxPreferences,
} from "@/lib/mailApi";
import {
  subscribeMailWebPush,
  unsubscribeMailWebPush,
} from "@/lib/mailPush";
import {
  isMailNotifySoundEnabled,
  playMailNotifyBeep,
  setMailNotifySoundEnabled,
} from "@/lib/mailNotifySound";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { isIosSafari, isStandaloneMailPwa } from "@/lib/mailIosPwa";

type Props = {
  accessToken: string;
  notificationsPwaFocus?: boolean;
};

function NotifyToggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={
        disabled
          ? "mail-posta-toggle mail-posta-toggle--disabled"
          : "mail-posta-toggle"
      }
    >
      <input
        type="checkbox"
        className="mail-posta-toggle-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="mail-posta-toggle-track" aria-hidden="true">
        <span className="mail-posta-toggle-thumb" />
      </span>
      <span className="mail-posta-toggle-text">
        <span className="mail-posta-toggle-label">{label}</span>
        {hint ? <span className="mail-posta-toggle-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function MailNotificationsSettingsPanel({
  accessToken,
  notificationsPwaFocus = false,
}: Props) {
  const { t } = useMailLocale();
  const [pushConfigured, setPushConfigured] = useState(false);
  const [showIosOnboarding, setShowIosOnboarding] = useState(false);
  const [notifySound, setNotifySound] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);

  const reload = useCallback(async () => {
    const [push, prefs] = await Promise.all([
      fetchMailPushConfig(accessToken),
      fetchInboxPreferences(accessToken),
    ]);
    setPushConfigured(push.config.enabled);
    setDailyDigest(prefs.preferences.dailyDigestEnabled);
  }, [accessToken]);

  useEffect(() => {
    setNotifySound(isMailNotifySoundEnabled());
  }, []);

  useEffect(() => {
    setShowIosOnboarding(isIosSafari() && !isStandaloneMailPwa());
  }, []);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      setError("");
      try {
        await reload();
      } catch {
        setError(t("notifyLoadError"));
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload, t]);

  function setStatusMessage(message: string, isError = false) {
    if (isError) {
      setError(message);
      setStatus("");
    } else {
      setStatus(message);
      setError("");
    }
  }

  async function onEnablePush() {
    setPushBusy(true);
    setStatusMessage("");
    try {
      const result = await subscribeMailWebPush(accessToken);
      if (result === "enabled") {
        setStatusMessage("Bildirimler açıldı.");
      } else if (result === "denied") {
        setStatusMessage("Tarayıcı bildirim izni reddedildi.", true);
      } else if (result === "unsupported") {
        setStatusMessage("Bu tarayıcı Web Push desteklemiyor.", true);
      } else {
        setStatusMessage("Push sunucuda kapalı.", true);
      }
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Abonelik başarısız.",
        true,
      );
    } finally {
      setPushBusy(false);
    }
  }

  async function onDisablePush() {
    setPushBusy(true);
    setStatusMessage("");
    try {
      await unsubscribeMailWebPush(accessToken);
      setStatusMessage("Bildirimler kapatıldı.");
    } catch {
      setStatusMessage("Kapatılamadı.", true);
    } finally {
      setPushBusy(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="mail-notify-panel mail-notify-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-notify-panel mail-notify-panel--premium">
      <p className="mail-posta-intro">
        Yeni gelen posta için tarayıcı bildirimi (Web Push). HTTPS ve tarayıcı izni
        gerekir; sekme kapalıyken de uyarı alabilirsiniz.
      </p>

      {showIosOnboarding ? (
        <div
          className="mail-notify-info mail-notify-info--pwa mail-notify-info--ios"
          role="note"
        >
          <span className="mail-notify-info-icon" aria-hidden="true">📱</span>
          <div>
            <p className="mail-notify-info-title">{t("iosPwaSettingsTitle")}</p>
            <ol className="mail-ios-pwa-settings-steps">
              <li>{t("iosPwaStep1")}</li>
              <li>{t("iosPwaStep2")}</li>
              <li>{t("iosPwaStep3")}</li>
            </ol>
            <p className="mail-notify-info-body">{t("iosPwaSettingsHint")}</p>
          </div>
        </div>
      ) : null}

      {notificationsPwaFocus ? (
        <div
          id="mail-pwa-offline-push"
          className="mail-notify-info mail-notify-info--pwa"
          role="status"
        >
          <span className="mail-notify-info-icon" aria-hidden="true">📲</span>
          <div>
            <p className="mail-notify-info-title">PWA ve çevrimdışı mod</p>
            <p className="mail-notify-info-body">
              <code>/manifest.webmanifest</code> ve <code>sw.js</code> ile ana
              ekrana ekleyebilirsiniz. Çevrimdışı modda gelen kutusu önbelleği salt
              okunur gösterilir; Web Push için alttaki{" "}
              <strong>Bildirimleri aç</strong> düğmesini kullanın.
            </p>
          </div>
        </div>
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

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-notify-card-head">
          <div>
            <h3 className="mail-posta-card-title">Web Push bildirimleri</h3>
            <p className="mail-posta-card-desc">
              Masaüstü ve Android tarayıcılarda anlık uyarı; iOS için ana ekran
              uygulaması gerekir.
            </p>
          </div>
          <span
            className={
              pushConfigured
                ? "mail-notify-pill mail-notify-pill--ready"
                : "mail-notify-pill mail-notify-pill--off"
            }
          >
            {pushConfigured ? "Sunucu hazır" : "Sunucu yapılandırılmamış"}
          </span>
        </header>

        {!pushConfigured ? (
          <p className="mail-notify-server-warn" role="note">
            Sunucuda push henüz yapılandırılmamış (VAPID anahtarları). Yönetici
            kurulumu tamamlanana kadar abonelik açılamaz.
          </p>
        ) : null}

        <div className="mail-notify-info mail-notify-info--ios">
          <span className="mail-notify-info-icon" aria-hidden="true">🍎</span>
          <div>
            <p className="mail-notify-info-title">iPhone / iPad (Safari)</p>
            <p className="mail-notify-info-body">
              Bildirimler tarayıcı <em>sekmede</em> çalışmaz. Paylaş →{" "}
              <strong>Ana Ekrana Ekle</strong>, uygulamayı ana ekrandan açın, sonra
              buradan bildirimleri açın.
            </p>
          </div>
        </div>

        <div className="mail-notify-push-actions">
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            disabled={!pushConfigured || pushBusy}
            onClick={() => void onEnablePush()}
          >
            {pushBusy ? "İşleniyor…" : "Bildirimleri aç"}
          </button>
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--ghost"
            disabled={pushBusy}
            onClick={() => void onDisablePush()}
          >
            Bildirimleri kapat
          </button>
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Ses ve özet</h3>
          <p className="mail-posta-card-desc">
            Sekme açıkken sesli uyarı ve sabah günlük özet e-postası.
          </p>
        </header>
        <div className="mail-notify-toggles">
          <NotifyToggle
            checked={notifySound}
            onChange={(on) => {
              setNotifySound(on);
              setMailNotifySoundEnabled(on);
              if (on) {
                playMailNotifyBeep();
              }
            }}
            label="Yeni posta bildiriminde ses"
            hint="Sekme açıkken gelen kutusunda kısa bip çalar."
          />
          <NotifyToggle
            checked={dailyDigest}
            onChange={(on) => {
              const prev = dailyDigest;
              setDailyDigest(on);
              void updateInboxPreferences(accessToken, {
                dailyDigestEnabled: on,
              }).catch(() => {
                setStatusMessage("Özet ayarı kaydedilemedi.", true);
                setDailyDigest(prev);
              });
            }}
            label="Günlük özet e-postası"
            hint="Her gün 08:00’de okunmamış varsa özet gönderilir."
          />
        </div>
      </section>
    </div>
  );
}
