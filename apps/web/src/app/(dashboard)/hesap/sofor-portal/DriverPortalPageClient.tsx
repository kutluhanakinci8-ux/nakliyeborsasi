"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CountryFlag } from "../../../../components/CountryFlag";
import { useWebSession } from "../../../../context/WebSessionProvider";
import {
  FleetApiClient,
  type DriverPortalSnapshot,
} from "../../../../lib/FleetApiClient";

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function dutyLabel(status: DriverPortalSnapshot["dutyStatus"]): string {
  switch (status) {
    case "ON_DUTY":
      return "Görevde";
    case "AVAILABLE":
      return "Müsait";
    case "OFF":
      return "İzinli / pasif";
  }
}

export function DriverPortalPageClient() {
  const { accessToken, locale, session } = useWebSession();
  const [portal, setPortal] = useState<DriverPortalSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPortal = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const snapshot = await FleetApiClient.fetchDriverPortal(accessToken, locale);
      setPortal(snapshot);
    } catch {
      setPortal(null);
      const isDriverRole = session?.roleCodes?.includes("FLEET_DRIVER");
      setErrorMessage(
        isDriverRole
          ? "Şoför kaydı henüz bağlanmamış. Firma yöneticisi Filo → şoför → kullanıcı e-postası bağlamalı."
          : "Bu hesap şoför portalı için uygun değil. Şoför girişi: kutluhantest-sofor@test.nakliyeborsasi.local veya firma sahibi Filo sekmesini kullanın.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, locale, session?.roleCodes]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  if (loading) {
    return <p className="loading-inline">Şoför portalı yükleniyor…</p>;
  }

  if (!portal) {
    return (
      <div className="driver-portal-page">
        <div className="driver-portal-card">
          <p className="error banner error--light">{errorMessage}</p>
          <p className="driver-portal-lead">
            Taşıyıcı yönetimi: <Link href="/hesap/filo">Filo ve şoförler</Link> ·
            Yük arama: <Link href="/marketplace">Marketplace</Link>
          </p>
        </div>
      </div>
    );
  }

  const active = portal.activeJob;
  const completedJobs = portal.jobs.filter((job) => job.phase === "COMPLETED");
  const activeJobs = portal.jobs.filter((job) => job.phase === "ACTIVE");

  return (
    <div className="driver-portal-page">
      <header className="driver-portal-hero">
        <div className="driver-portal-hero-main">
          <p className="driver-portal-eyebrow">Şoför portalı · TR · UA · EU</p>
          <h1 className="driver-portal-title">{portal.driver.displayName}</h1>
          <p className="driver-portal-lead">
            {portal.company?.legalName ?? "Taşıyıcı"} ·{" "}
            <span className={`driver-portal-duty driver-portal-duty--${portal.dutyStatus.toLowerCase()}`}>
              {dutyLabel(portal.dutyStatus)}
            </span>
          </p>
          {portal.activeVehicle ? (
            <p className="driver-portal-vehicle">
              Araç <strong>{portal.activeVehicle.licensePlateDisplay}</strong> ·{" "}
              {portal.activeVehicle.equipmentTypeCode}
            </p>
          ) : null}
        </div>
        <div className="driver-portal-hero-stats">
          <div className="driver-portal-stat">
            <span className="driver-portal-stat-label">Bu ay kazanç</span>
            <span className="driver-portal-stat-value">
              {formatMoney(
                portal.earnings.monthToDateAmount,
                portal.earnings.currencyCode,
              )}
            </span>
          </div>
          <div className="driver-portal-stat">
            <span className="driver-portal-stat-label">Yıl toplam</span>
            <span className="driver-portal-stat-value">
              {formatMoney(
                portal.earnings.yearToDateAmount,
                portal.earnings.currencyCode,
              )}
            </span>
          </div>
          <div className="driver-portal-stat">
            <span className="driver-portal-stat-label">Seferler</span>
            <span className="driver-portal-stat-value">
              {portal.earnings.completedTripCount} tamam ·{" "}
              {portal.earnings.pendingTripCount} aktif
            </span>
          </div>
        </div>
      </header>

      <section className="driver-portal-card">
        <h2 className="driver-portal-section-title">Konum & sensörler</h2>
        <p className="driver-portal-meta">
          Hız, durak ve güvenlik olayları — KVKK / GDPR uyumlu telemetri pilotu.
        </p>
        <Link href="/sofor/telemetri" className="btn btn-secondary">
          Telemetri ayarları
        </Link>
      </section>

      {active ? (
        <section className="driver-portal-card driver-portal-card--accent">
          <h2 className="driver-portal-section-title">Aktif görev</h2>
          <div className="driver-portal-route">
            <div className="driver-portal-route-point">
              <CountryFlag code={active.originCountryCode} size="sm" />
              <div>
                <strong>{active.originCityName}</strong>
                <span>Alım / yükleme</span>
              </div>
            </div>
            <span className="driver-portal-route-arrow" aria-hidden>→</span>
            <div className="driver-portal-route-point">
              <CountryFlag code={active.destinationCountryCode} size="sm" />
              <div>
                <strong>{active.destinationCityName}</strong>
                <span>Teslim</span>
              </div>
            </div>
          </div>
          <p className="driver-portal-meta">
            {active.statusLabel} · Yükleme {active.loadingDateStart}
            {active.cargoLabel ? ` · ${active.cargoLabel}` : ""}
          </p>
          {active.revenueAmount !== null ? (
            <p className="driver-portal-payout">
              Tahmini hakediş:{" "}
              <strong>
                {formatMoney(active.revenueAmount, active.revenueCurrencyCode ?? "EUR")}
              </strong>
            </p>
          ) : null}
        </section>
      ) : (
        <section className="driver-portal-card">
          <p className="driver-portal-meta">Şu an atanmış aktif sefer yok — müsait durumdasınız.</p>
        </section>
      )}

      <div className="driver-portal-columns">
        <section className="driver-portal-card">
          <h2 className="driver-portal-section-title">Devam eden</h2>
          <ul className="driver-portal-timeline">
            {activeJobs.length === 0 ? (
              <li className="driver-portal-timeline-empty">Kayıt yok</li>
            ) : (
              activeJobs.map((job) => (
                <li key={`${job.kind}-${job.jobId}`} className="driver-portal-timeline-item">
                  <span className="driver-portal-timeline-badge">Aktif</span>
                  <strong>
                    {job.originCityName} → {job.destinationCityName}
                  </strong>
                  <span>{job.statusLabel}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="driver-portal-card">
          <h2 className="driver-portal-section-title">Teslim edilenler</h2>
          <ul className="driver-portal-timeline">
            {completedJobs.length === 0 ? (
              <li className="driver-portal-timeline-empty">Henüz tamamlanan sefer yok</li>
            ) : (
              completedJobs.map((job) => (
                <li key={`${job.kind}-${job.jobId}`} className="driver-portal-timeline-item">
                  <span className="driver-portal-timeline-badge driver-portal-timeline-badge--done">
                    Tamam
                  </span>
                  <strong>
                    {job.originCityName} → {job.destinationCityName}
                  </strong>
                  <span>
                    {job.completedAt ?? job.loadingDateStart}
                    {job.revenueAmount !== null
                      ? ` · ${formatMoney(job.revenueAmount, job.revenueCurrencyCode ?? "EUR")}`
                      : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="driver-portal-foot">
        Mesaj ve belgeler için <Link href="/messaging">Mesajlar</Link> · Şirket filosu{" "}
        <Link href="/hesap/filo">Filo yönetimi</Link> (yalnızca yönetici hesabı)
      </p>
    </div>
  );
}
