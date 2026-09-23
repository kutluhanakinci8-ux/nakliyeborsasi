"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWebSession } from "../../../../context/WebSessionProvider";
import {
  TelemetryApiClient,
  type TelemetryDriverStatusSnapshot,
  type TelemetryEnrollResult,
} from "../../../../lib/TelemetryApiClient";
import { geolocationBlockedReason } from "../../../../lib/geolocationContext";

const STORAGE_KEY = "nb-telemetry-enrollment-v1";

function loadStoredEnrollment(): TelemetryEnrollResult | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TelemetryEnrollResult;
  } catch {
    return null;
  }
}

function eventLabel(code: string): string {
  const map: Record<string, string> = {
    LOCATION_SAMPLE: "Konum",
    TRIP_START: "Sefer başladı",
    TRIP_END: "Sefer bitti",
    STOP_DETECTED: "Durak",
    SPEED_EXCEEDED: "Hız limiti",
    HARSH_BRAKE: "Sert fren",
    HARSH_ACCELERATION: "Sert kalkış",
    COLLISION_SUSPECTED: "Olası çarpışma",
    DEVICE_HEARTBEAT: "Cihaz nabız",
  };
  return map[code] ?? code;
}

export function DriverTelematicsPageClient() {
  const { accessToken } = useWebSession();
  const [status, setStatus] = useState<TelemetryDriverStatusSnapshot | null>(
    null,
  );
  const [enrollment, setEnrollment] = useState<TelemetryEnrollResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  useEffect(() => {
    setGeoWarning(geolocationBlockedReason());
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setErrorMessage("");
    try {
      const snapshot = await TelemetryApiClient.fetchStatus(accessToken);
      setStatus(snapshot);
    } catch {
      setErrorMessage("Telemetri durumu alınamadı.");
    }
  }, [accessToken]);

  useEffect(() => {
    setEnrollment(loadStoredEnrollment());
    void refresh();
  }, [refresh]);

  const grantConsent = async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      const snapshot = await TelemetryApiClient.grantConsent(accessToken);
      setStatus(snapshot);
    } catch {
      setErrorMessage("Rıza kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const revokeConsent = async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    try {
      const snapshot = await TelemetryApiClient.revokeConsent(accessToken);
      setStatus(snapshot);
      window.sessionStorage.removeItem(STORAGE_KEY);
      setEnrollment(null);
    } catch {
      setErrorMessage("Rıza geri çekilemedi.");
    } finally {
      setBusy(false);
    }
  };

  const enrollIphone = async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setBusy(true);
    setErrorMessage("");
    try {
      if (!status?.consent.trackingEnabled) {
        await TelemetryApiClient.grantConsent(accessToken);
      }
      const result = await TelemetryApiClient.enrollDevice(accessToken, {
        platformCode: "IOS",
        deviceLabel: "iPhone pilot",
      });
      const serialized = JSON.stringify(result);
      window.sessionStorage.setItem(STORAGE_KEY, serialized);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      setEnrollment(result);
      await refresh();
    } catch {
      setErrorMessage("Cihaz eşleştirme başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const device = status?.device;
  const consent = status?.consent;

  return (
    <div className="driver-portal-page driver-telematics-page">
      <header className="driver-portal-card">
        <p className="driver-portal-eyebrow">Global telemetri · GDPR / KVKK</p>
        <h1 className="driver-portal-title">Konum & sensörler</h1>
        <p className="driver-portal-lead">
          Hız, duraklar ve güvenlik olayları yalnızca açık rıza ve taşıma görevi
          kapsamında işlenir.{" "}
          <Link href="/sofor">← Şoför paneli</Link>
        </p>
        {errorMessage ? (
          <p className="error banner error--light">{errorMessage}</p>
        ) : null}
      </header>

      <section className="driver-portal-card">
        <h2 className="driver-portal-section-title">Rıza durumu</h2>
        <p className="driver-telematics-meta">
          Belge sürümü: <strong>{consent?.consentDocumentVersion ?? "—"}</strong>
        </p>
        <p className="driver-telematics-meta">{consent?.legalBasisSummary}</p>
        <ul className="driver-telematics-list">
          {(consent?.purposes ?? []).map((purpose) => (
            <li key={purpose}>{purpose}</li>
          ))}
        </ul>
        <p className="driver-telematics-meta">
          Ham örnek saklama: {consent?.retentionDaysRawSamples ?? 90} gün ·
          güvenlik olayları: {consent?.retentionDaysSafetyEvents ?? 365} gün
        </p>
        <div className="driver-telematics-actions">
          {!consent?.trackingEnabled ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void grantConsent()}
            >
              Rızayı onayla
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void revokeConsent()}
            >
              Takibi durdur / rızayı geri çek
            </button>
          )}
        </div>
      </section>

      <section className="driver-portal-card driver-portal-card--accent">
        <h2 className="driver-portal-section-title">iPhone cihazı</h2>
        <p className="driver-telematics-meta">
          Test numarası filo kaydında <strong>+905546902543</strong> olmalı.
          iPhone’da canlı konum için <strong>HTTPS</strong> şart:{" "}
          <a href="https://168.231.109.27/sofor/telemetri">
            https://168.231.109.27/sofor/telemetri
          </a>{" "}
          (HTTP :3011 konum izni vermez).
        </p>
        {geoWarning ? (
          <p className="error banner error--light">{geoWarning}</p>
        ) : null}
        {device ? (
          <p className="driver-telematics-meta">
            Son görülme: {device.lastSeenAt ?? "henüz yok"} · platform:{" "}
            {device.platformCode}
            {device.lastLatitude !== null && device.lastLongitude !== null ? (
              <>
                {" "}
                · son konum: {device.lastLatitude.toFixed(4)},{" "}
                {device.lastLongitude.toFixed(4)}
                {device.lastSpeedKmh !== null
                  ? ` · ${device.lastSpeedKmh.toFixed(0)} km/s`
                  : null}
              </>
            ) : null}
          </p>
        ) : (
          <p className="driver-telematics-meta">Henüz eşleşmiş cihaz yok.</p>
        )}
        <div className="driver-telematics-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void enrollIphone()}
          >
            iPhone eşleştir (yeni token)
          </button>
          {enrollment ? (
            <Link
              href="/sofor/telemetri/cihaz"
              className="btn btn-secondary"
            >
              Canlı gönderim ekranı
            </Link>
          ) : null}
        </div>
        {enrollment ? (
          <p className="driver-telematics-token-hint">
            Bu oturumda cihaz token kayıtlı. Token yalnızca bir kez gösterilir;
            companion sayfasına geçin.
          </p>
        ) : null}
      </section>

      <section className="driver-portal-card">
        <h2 className="driver-portal-section-title">Son olaylar</h2>
        {(status?.recentEvents.length ?? 0) === 0 ? (
          <p className="driver-telematics-meta">Henüz olay yok.</p>
        ) : (
          <ul className="driver-telematics-events">
            {status?.recentEvents.map((event) => (
              <li key={event.eventId}>
                <span className={`driver-telematics-sev driver-telematics-sev--${(event.severity ?? "info").toLowerCase()}`}>
                  {eventLabel(event.eventTypeCode)}
                </span>
                <span>{new Date(event.recordedAt).toLocaleString("tr-TR")}</span>
                {event.speedKmh !== null ? (
                  <span>{event.speedKmh.toFixed(0)} km/s</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
