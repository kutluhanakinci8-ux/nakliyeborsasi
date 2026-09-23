"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TelemetryApiClient,
  type TelemetryEnrollResult,
} from "../../../../../lib/TelemetryApiClient";
import { geolocationBlockedReason } from "../../../../../lib/geolocationContext";

const STORAGE_KEY = "nb-telemetry-enrollment-v1";

function metersPerSecondToKmh(speed: number | null): number | null {
  if (speed === null || !Number.isFinite(speed)) {
    return null;
  }
  return speed * 3.6;
}

export function DriverTelemetryCompanionClient() {
  const [enrollment, setEnrollment] = useState<TelemetryEnrollResult | null>(
    null,
  );
  const [tracking, setTracking] = useState(false);
  const [lastError, setLastError] = useState("");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  type BufferedEvent = {
    eventTypeCode: string;
    recordedAt: string;
    latitude?: number;
    longitude?: number;
    speedKmh?: number;
    headingDegrees?: number;
    horizontalAccuracyMeters?: number;
    payload?: Record<string, unknown>;
  };

  const bufferRef = useRef<BufferedEvent[]>([]);

  useEffect(() => {
    const raw =
      window.sessionStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setEnrollment(JSON.parse(raw) as TelemetryEnrollResult);
      } catch {
        setEnrollment(null);
      }
    }
  }, []);

  const flushBuffer = useCallback(async () => {
    if (!enrollment || bufferRef.current.length === 0) {
      return;
    }
    const events = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await TelemetryApiClient.ingestBatch({
        deviceId: enrollment.deviceId,
        ingestToken: enrollment.ingestToken,
        batchId: crypto.randomUUID(),
        events,
      });
      setLastSentAt(new Date().toISOString());
      setLastError("");
      setPendingCount(0);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Gönderim başarısız";
      setLastError(
        detail.includes("Unauthorized")
          ? "Cihaz token geçersiz. Telemetri ayarlarından «iPhone eşleştir» ile yenileyin."
          : `Gönderim başarısız: ${detail.slice(0, 180)}`,
      );
      bufferRef.current.unshift(...events);
      setPendingCount(bufferRef.current.length);
    }
  }, [enrollment]);

  const scheduleFlush = useCallback(() => {
    setPendingCount(bufferRef.current.length);
    if (flushTimerRef.current !== null) {
      return;
    }
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flushBuffer();
    }, 2000);
  }, [flushBuffer]);

  useEffect(() => {
    if (!tracking) {
      return;
    }
    const interval = window.setInterval(() => {
      void flushBuffer();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [tracking, flushBuffer]);

  const startTracking = useCallback((): void => {
    if (!enrollment) {
      setLastError("Önce /sofor/telemetri üzerinden iPhone eşleştirin.");
      return;
    }
    const blocked = geolocationBlockedReason();
    if (blocked) {
      setLastError(blocked);
      return;
    }
    setTracking(true);
    setLastError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const speedKmh = metersPerSecondToKmh(position.coords.speed);
        bufferRef.current.push({
          eventTypeCode: "LOCATION_SAMPLE",
          recordedAt: new Date(position.timestamp).toISOString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKmh: speedKmh ?? undefined,
          headingDegrees:
            typeof position.coords.heading === "number" &&
            Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : undefined,
          horizontalAccuracyMeters: position.coords.accuracy,
        });
        scheduleFlush();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLastError(
            "Konum izni reddedildi. Ayarlar → Safari → Konum veya site için «İzin ver» seçin.",
          );
        } else {
          setLastError(error.message);
        }
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [enrollment, scheduleFlush]);

  const onMotion = useCallback((event: DeviceMotionEvent): void => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) {
      return;
    }
    const magnitude = Math.sqrt(
      (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
    );
    if (magnitude > 28) {
      bufferRef.current.push({
        eventTypeCode: "HARSH_BRAKE",
        recordedAt: new Date().toISOString(),
        payload: { magnitude },
      });
    }
    if (magnitude > 35) {
      bufferRef.current.push({
        eventTypeCode: "COLLISION_SUSPECTED",
        recordedAt: new Date().toISOString(),
        payload: { magnitude },
      });
    }
  }, []);

  const startTrackingWithMotion = (): void => {
    startTracking();
    if (typeof window.DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", onMotion);
    }
  };

  const stopTracking = (): void => {
    setTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    window.removeEventListener("devicemotion", onMotion);
    void flushBuffer();
  };

  return (
    <div className="driver-portal-page driver-telematics-page">
      <header className="driver-portal-card">
        <h1 className="driver-portal-title">Canlı telemetri (pilot)</h1>
        <p className="driver-portal-lead">
          iPhone Safari: uygulama ön planda kalsın; iOS arka plan GPS için native
          uygulama gerekir. <Link href="/sofor/telemetri">← Telemetri ayarları</Link>
        </p>
        {lastError ? <p className="error banner error--light">{lastError}</p> : null}
      </header>
      <section className="driver-portal-card">
        {!enrollment ? (
          <p>Cihaz token yok. Telemetri sayfasından eşleştirin.</p>
        ) : (
          <>
            <p className="driver-telematics-meta">
              Cihaz: {enrollment.deviceId.slice(0, 8)}… ·{" "}
              {tracking ? "Gönderim açık" : "Durduruldu"}
            </p>
            {lastSentAt ? (
              <p className="driver-telematics-meta">
                Son başarılı paket: {new Date(lastSentAt).toLocaleString("tr-TR")}
              </p>
            ) : (
              <p className="driver-telematics-meta">
                Henüz sunucuya paket gitmedi — 2–5 sn bekleyin veya token yenileyin.
              </p>
            )}
            {pendingCount > 0 ? (
              <p className="driver-telematics-meta">
                Bekleyen örnek: {pendingCount}
              </p>
            ) : null}
            <div className="driver-telematics-actions">
              {!tracking ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startTrackingWithMotion}
                >
                  Konumu paylaşmaya başla
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={stopTracking}
                >
                  Durdur
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
