"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TelemetryGpsSamplingProfileCode,
  TelemetrySpeedSourceCode,
  TELEMETRY_WEB_COMPANION_FLUSH_MS,
} from "@nakliyeborsasi/core";
import {
  TelemetryApiClient,
  type TelemetryEnrollResult,
} from "../../../../../lib/TelemetryApiClient";
import { geolocationBlockedReason } from "../../../../../lib/geolocationContext";

const STORAGE_KEY = "nb-telemetry-enrollment-v1";
/** Web companion hedefi ~2 Hz (native 1–3 Hz). */
const LOCATION_SAMPLE_INTERVAL_MS = 500;
const MOTION_SAMPLE_INTERVAL_MS = 500;

function metersPerSecondToKmh(speed: number | null): number | null {
  if (speed === null || !Number.isFinite(speed)) {
    return null;
  }
  return speed * 3.6;
}

type BufferedEvent = {
  eventTypeCode: string;
  recordedAt: string;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  headingDegrees?: number;
  horizontalAccuracyMeters?: number;
  altitudeMeters?: number;
  verticalAccuracyMeters?: number;
  speedSourceCode?: string;
  payload?: Record<string, unknown>;
};

type LastFix = {
  latitude: number;
  longitude: number;
  speedKmh?: number;
  headingDegrees?: number;
  horizontalAccuracyMeters?: number;
  altitudeMeters?: number;
  verticalAccuracyMeters?: number;
  recordedAt: string;
};

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
  const sampleTimerRef = useRef<number | null>(null);
  const lastFixRef = useRef<LastFix | null>(null);
  const lastMotionSampleAtRef = useRef(0);
  const lastOrientationRef = useRef<{
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  }>({ alpha: null, beta: null, gamma: null });

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
    }, TELEMETRY_WEB_COMPANION_FLUSH_MS);
  }, [flushBuffer]);

  const pushLocationSample = useCallback(() => {
    const fix = lastFixRef.current;
    if (!fix) {
      return;
    }
    bufferRef.current.push({
      eventTypeCode: "LOCATION_SAMPLE",
      recordedAt: fix.recordedAt,
      latitude: fix.latitude,
      longitude: fix.longitude,
      speedKmh: fix.speedKmh,
      headingDegrees: fix.headingDegrees,
      horizontalAccuracyMeters: fix.horizontalAccuracyMeters,
      altitudeMeters: fix.altitudeMeters,
      verticalAccuracyMeters: fix.verticalAccuracyMeters,
      speedSourceCode: TelemetrySpeedSourceCode.Gps,
      payload: {
        samplingProfileCode: TelemetryGpsSamplingProfileCode.WebCompanion,
        speedSourceCode: TelemetrySpeedSourceCode.Gps,
        headingMagneticDegrees: lastOrientationRef.current.alpha,
      },
    });
    scheduleFlush();
  }, [scheduleFlush]);

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
        const altitude =
          typeof position.coords.altitude === "number" &&
          Number.isFinite(position.coords.altitude)
            ? position.coords.altitude
            : undefined;
        const verticalAccuracy =
          typeof position.coords.altitudeAccuracy === "number" &&
          Number.isFinite(position.coords.altitudeAccuracy)
            ? position.coords.altitudeAccuracy
            : undefined;
        lastFixRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKmh: speedKmh ?? undefined,
          headingDegrees:
            typeof position.coords.heading === "number" &&
            Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : undefined,
          horizontalAccuracyMeters: position.coords.accuracy,
          altitudeMeters: altitude,
          verticalAccuracyMeters: verticalAccuracy,
          recordedAt: new Date(position.timestamp).toISOString(),
        };
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
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 20000,
      },
    );
    sampleTimerRef.current = window.setInterval(() => {
      pushLocationSample();
    }, LOCATION_SAMPLE_INTERVAL_MS);
  }, [enrollment, pushLocationSample]);

  const onMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastMotionSampleAtRef.current < MOTION_SAMPLE_INTERVAL_MS) {
        return;
      }
      lastMotionSampleAtRef.current = now;
      const fix = lastFixRef.current;
      const linear = event.acceleration;
      const withGravity = event.accelerationIncludingGravity;
      const rotation = event.rotationRate;
      const payload: Record<string, unknown> = {
        samplingProfileCode: TelemetryGpsSamplingProfileCode.WebCompanion,
      };
      if (linear) {
        payload.linearAccelerationMs2 = {
          x: linear.x ?? 0,
          y: linear.y ?? 0,
          z: linear.z ?? 0,
        };
      }
      if (withGravity) {
        payload.accelerationIncludingGravityMs2 = {
          x: withGravity.x ?? 0,
          y: withGravity.y ?? 0,
          z: withGravity.z ?? 0,
        };
      }
      if (rotation) {
        payload.gyroRadS = {
          x: rotation.alpha ?? 0,
          y: rotation.beta ?? 0,
          z: rotation.gamma ?? 0,
        };
      }
      const orient = lastOrientationRef.current;
      if (orient.alpha !== null) {
        payload.magnetometerHeadingDegrees = orient.alpha;
        payload.deviceOrientation = {
          alpha: orient.alpha,
          beta: orient.beta,
          gamma: orient.gamma,
        };
      }
      bufferRef.current.push({
        eventTypeCode: "MOTION_SAMPLE",
        recordedAt: new Date().toISOString(),
        latitude: fix?.latitude,
        longitude: fix?.longitude,
        speedKmh: fix?.speedKmh,
        headingDegrees: fix?.headingDegrees,
        payload,
      });
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    lastOrientationRef.current = {
      alpha:
        typeof event.alpha === "number" && Number.isFinite(event.alpha)
          ? event.alpha
          : null,
      beta:
        typeof event.beta === "number" && Number.isFinite(event.beta)
          ? event.beta
          : null,
      gamma:
        typeof event.gamma === "number" && Number.isFinite(event.gamma)
          ? event.gamma
          : null,
    };
  }, []);

  const requestMotionPermission = async (): Promise<boolean> => {
    const ctor = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof ctor.requestPermission === "function") {
      try {
        const result = await ctor.requestPermission();
        return result === "granted";
      } catch {
        return false;
      }
    }
    return true;
  };

  const startTrackingWithMotion = async (): Promise<void> => {
    const motionOk = await requestMotionPermission();
    if (!motionOk) {
      setLastError(
        "Hareket sensörü izni verilmedi; sadece konum gönderilecek.",
      );
    }
    startTracking();
    if (typeof window.DeviceMotionEvent !== "undefined" && motionOk) {
      window.addEventListener("devicemotion", onMotion);
    }
    if (typeof window.DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", onOrientation);
    }
  };

  const stopTracking = (): void => {
    setTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sampleTimerRef.current !== null) {
      window.clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }
    window.removeEventListener("devicemotion", onMotion);
    window.removeEventListener("deviceorientation", onOrientation);
    void flushBuffer();
  };

  return (
    <div className="driver-portal-page driver-telematics-page">
      <header className="driver-portal-card">
        <h1 className="driver-portal-title">Canlı telemetri (pilot)</h1>
        <p className="driver-portal-lead">
          iPhone Safari: uygulama ön planda kalsın; arka plan 1–3 Hz ve Core
          Motion için native uygulama gerekir. Rakım, dikey doğruluk ve IMU
          örnekleri bu sayfadan gönderilir.{" "}
          <Link href="/sofor/telemetri">← Telemetri ayarları</Link>
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
              {tracking ? "Gönderim açık (~2 Hz)" : "Durduruldu"}
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
                  onClick={() => void startTrackingWithMotion()}
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
