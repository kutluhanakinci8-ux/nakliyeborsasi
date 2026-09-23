"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useWebSession } from "../../../../context/WebSessionProvider";
import {
  FleetApiClient,
  type FleetDriverSummary,
  type FleetVehicleSummary,
} from "../../../../lib/FleetApiClient";

type EmployeeRecord = {
  employeeId: string;
  name: string;
  email: string;
  roleLabel: string;
  status: "active" | "invited";
};

const STORAGE_PREFIX = "nb-company-employees:";

export function EmployeesPageClient() {
  const { accessToken, locale, session } = useWebSession();
  const companyId = session?.companyId ?? "";
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [drivers, setDrivers] = useState<readonly FleetDriverSummary[]>([]);
  const [vehicles, setVehicles] = useState<readonly FleetVehicleSummary[]>([]);
  const [fleetError, setFleetError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState("");

  const loadFleet = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setFleetError("");
    try {
      const overview = await FleetApiClient.fetchOverview(accessToken, locale);
      setDrivers(overview.drivers);
      setVehicles(overview.vehicles);
    } catch (error) {
      setDrivers([]);
      setVehicles([]);
      const text = error instanceof Error ? error.message : "";
      if (text.includes("SUBSCRIPTION_ENTITLEMENT") || text.includes("subscription")) {
        setFleetError("Filo modülü bu planda kapalı. Yönetici ile planı kontrol edin.");
      } else if (text) {
        setFleetError("Filo listesi yüklenemedi. Filo sekmesinden tekrar deneyin.");
      }
    }
  }, [accessToken, locale]);

  useEffect(() => {
    if (!companyId || typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
    if (raw) {
      try {
        setEmployees(JSON.parse(raw) as EmployeeRecord[]);
      } catch {
        setEmployees([]);
      }
    } else {
      setEmployees([]);
    }
  }, [companyId]);

  useEffect(() => {
    void loadFleet();
  }, [loadFleet]);

  function persist(list: EmployeeRecord[]): void {
    setEmployees(list);
    if (companyId) {
      window.localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(list));
    }
  }

  function handleInvite(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      return;
    }
    const record: EmployeeRecord = {
      employeeId: `emp-${Date.now()}`,
      name: email.split("@")[0] ?? "Yeni kullanıcı",
      email,
      roleLabel: "Görüntüleme",
      status: "invited",
    };
    persist([record, ...employees]);
    setInviteEmail("");
    setMessage("Davet kaydedildi (yerel taslak — API daveti sonraki sürüm).");
    window.setTimeout(() => setMessage(""), 4000);
  }

  const isCarrier =
    session?.companyParticipantTypeCode === "LOAD_CARRIER" ||
    session?.companyParticipantTypeCode === "LOAD_SEEKER";

  return (
    <>
      {isCarrier ? (
        <section className="account-card module-panel module-panel--elevated account-form-span-2">
          <header className="account-card-head">
            <div>
              <h2 className="account-card-title">Filo özeti (canlı)</h2>
              <p className="account-card-lead">
                Şoför ve kamyon kayıtları veritabanında tutulur; burada özet görünür.
                Detaylı yönetim için{" "}
                <Link href="/hesap/filo">Filo ve şoförler</Link> sekmesini kullanın.
              </p>
            </div>
            <Link href="/hesap/filo" className="btn-account-primary">
              Filo yönetimi
            </Link>
          </header>
          {fleetError ? <p className="error banner error--light">{fleetError}</p> : null}
          <p className="account-meta-line">
            <strong>{drivers.length}</strong> şoför · <strong>{vehicles.length}</strong> araç
          </p>
        </section>
      ) : null}

      <form
        className="account-card module-panel module-panel--elevated"
        onSubmit={handleInvite}
      >
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Ofis davetleri (taslak)</h2>
            <p className="account-card-lead">
              Dispatch ve ofis kullanıcıları için e-posta daveti — şoför kaydı filo API üzerinden
              yapılır.
            </p>
          </div>
          <button type="submit" className="btn-account-primary">Davet gönder</button>
        </header>
        <label className="label-light account-form-span-2">
          E-posta
          <input
            className="input-light"
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="kullanici@firma.com"
          />
        </label>
        {message ? <p className="account-save-hint">{message}</p> : null}
      </form>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Filo şoförleri</h2>
            <p className="account-card-lead">
              API kayıtları — Kutluhan test hesabında 2 şoför seed ile gelir.
            </p>
          </div>
        </header>
        <ul className="account-partner-list">
          {drivers.length === 0 ? (
            <li className="account-partner-item">
              <p className="account-partner-meta">
                Kayıtlı şoför yok veya filo yüklenemedi.{" "}
                <Link href="/hesap/filo">Filo sekmesine gidin</Link>.
              </p>
            </li>
          ) : (
            drivers.map((driver) => (
              <li key={driver.driverId} className="account-partner-item">
                <div className="account-partner-main">
                  <div className="account-partner-title-row">
                    <h3 className="account-partner-name">{driver.displayName}</h3>
                    <span className="account-status-pill account-status-pill--ok">
                      {driver.statusCode}
                    </span>
                  </div>
                  <p className="account-partner-meta">
                    <span>Şoför</span>
                    <span aria-hidden>·</span>
                    <span>
                      {driver.activeVehiclePlate
                        ? `Araç: ${driver.activeVehiclePlate}`
                        : "Araç atanmadı"}
                    </span>
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Filo araçları</h2>
            <p className="account-card-lead">Plaka, ekipman ve durum.</p>
          </div>
        </header>
        <ul className="account-partner-list">
          {vehicles.length === 0 ? (
            <li className="account-partner-item">
              <p className="account-partner-meta">Kayıtlı araç yok.</p>
            </li>
          ) : (
            vehicles.map((vehicle) => (
              <li key={vehicle.vehicleId} className="account-partner-item">
                <div className="account-partner-main">
                  <div className="account-partner-title-row">
                    <h3 className="account-partner-name">{vehicle.licensePlateDisplay}</h3>
                    <span className="account-status-pill account-status-pill--pending">
                      {vehicle.statusCode}
                    </span>
                  </div>
                  <p className="account-partner-meta">
                    <span>{vehicle.equipmentTypeCode}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {vehicle.activeDriverName ?? "Şoför atanmadı"}
                    </span>
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {employees.length > 0 ? (
        <section className="account-card module-panel module-panel--elevated">
          <header className="account-card-head">
            <div>
              <h2 className="account-card-title">Yerel ofis davetleri</h2>
              <p className="account-card-lead">Tarayıcıda saklanan taslak liste.</p>
            </div>
          </header>
          <ul className="account-partner-list">
            {employees.map((employee) => (
              <li key={employee.employeeId} className="account-partner-item">
                <div className="account-partner-main">
                  <div className="account-partner-title-row">
                    <h3 className="account-partner-name">{employee.name}</h3>
                    <span
                      className={
                        employee.status === "active"
                          ? "account-status-pill account-status-pill--ok"
                          : "account-status-pill account-status-pill--pending"
                      }
                    >
                      {employee.status === "active" ? "Aktif" : "Davet bekliyor"}
                    </span>
                  </div>
                  <p className="account-partner-meta">
                    <span>{employee.email}</span>
                    <span aria-hidden>·</span>
                    <span>{employee.roleLabel}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
