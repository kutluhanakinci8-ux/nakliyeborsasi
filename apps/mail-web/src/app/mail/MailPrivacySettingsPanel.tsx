"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadMailPrivacyExport,
  fetchAiMailConsent,
  patchAiMailConsent,
  resolveMailConsoleUrl,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailPrivacySettingsPanel({ accessToken }: Props) {
  const [aiMailConsent, setAiMailConsent] = useState(false);
  const [aiConsentBusy, setAiConsentBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const reload = useCallback(async () => {
    const payload = await fetchAiMailConsent(accessToken);
    setAiMailConsent(payload.aiMailAssistConsent);
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      setError("");
      try {
        await reload();
      } catch {
        setError("Gizlilik ayarları yüklenemedi.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  async function onToggleAiConsent(next: boolean) {
    setAiConsentBusy(true);
    setError("");
    setStatus("");
    try {
      await patchAiMailConsent(accessToken, next);
      setAiMailConsent(next);
      setStatus(
        next
          ? "AI posta asistanı onayı kaydedildi."
          : "AI posta asistanı onayı kaldırıldı.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onay kaydedilemedi.");
    } finally {
      setAiConsentBusy(false);
    }
  }

  async function onExport() {
    setExporting(true);
    setStatus("");
    setError("");
    try {
      const { blob, filename } = await downloadMailPrivacyExport(accessToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("KVKK veri paketi indirildi (JSON).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarım başarısız.");
    } finally {
      setExporting(false);
    }
  }

  const consoleUrl = resolveMailConsoleUrl();

  if (initialLoading) {
    return (
      <div className="mail-privacy-panel mail-privacy-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-privacy-panel mail-privacy-panel--premium">
      <p className="mail-posta-intro">
        KVKK kapsamında kurumsal posta kimliği verilerinizi görüntüleyin ve
        indirin. Silme talebi ve veri işleme kayıtları firma yöneticisi için
        yönetim konsolunda yürütülür.
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
        <header className="mail-posta-card-head mail-privacy-card-head">
          <div>
            <h3 className="mail-posta-card-title">Veri erişimi (KVKK)</h3>
            <p className="mail-posta-card-desc">
              Posta kimliği, gönderenler ve ilgili kurumsal meta veriler JSON
              olarak indirilir.
            </p>
          </div>
          <span className="mail-privacy-pill">Madde 11</span>
        </header>
        <ul className="mail-privacy-bullets">
          <li>İndirme yalnızca oturumunuzdaki kurumsal hesap için geçerlidir.</li>
          <li>Dosyayı güvenli saklayın; üçüncü taraflarla paylaşmayın.</li>
          <li>Silme veya düzeltme talebi için yönetim konsolunu kullanın.</li>
        </ul>
        <div className="mail-privacy-actions">
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            disabled={exporting}
            onClick={() => void onExport()}
          >
            {exporting ? "Hazırlanıyor…" : "Verilerimi indir (JSON)"}
          </button>
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-privacy-card-head">
          <div>
            <h3 className="mail-posta-card-title">AI posta asistanı</h3>
            <p className="mail-posta-card-desc">
              Yanıt önerisi, özet ve sınıflandırma için açık rıza (KVKK).
            </p>
          </div>
          <span
            className={
              aiMailConsent
                ? "mail-privacy-pill mail-privacy-pill--on"
                : "mail-privacy-pill mail-privacy-pill--off"
            }
          >
            {aiMailConsent ? "Onaylı" : "Kapalı"}
          </span>
        </header>
        <label
          className={
            aiConsentBusy
              ? "mail-posta-toggle mail-posta-toggle--disabled"
              : "mail-posta-toggle"
          }
        >
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={aiMailConsent}
            disabled={aiConsentBusy}
            onChange={(e) => void onToggleAiConsent(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">
              AI posta asistanını kullan
            </span>
            <span className="mail-posta-toggle-hint">
              Kapatıldığında yanıt önerisi ve özet özellikleri devre dışı kalır.
            </span>
          </span>
        </label>
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Yönetim konsolu</h3>
          <p className="mail-posta-card-desc">
            Firma yöneticisi: silme talebi, DNS, posta kimliği ve teslimat
            ayarları.
          </p>
        </header>
        <a
          className="mail-privacy-console-link"
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Lerta yönetim konsolunu aç →
        </a>
      </section>
    </div>
  );
}
