"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useWebSession } from "../../../../context/WebSessionProvider";
import {
  FleetApiClient,
  type FleetDriverSummary,
  type FleetVehicleSummary,
} from "../../../../lib/FleetApiClient";

function equipmentLabel(code: string): string {
  const map: Record<string, string> = {
    TAUTLINER: "Tenteli",
    REFRIGERATED: "Frigo",
    FLATBED: "Açık",
  };
  return map[code] ?? code;
}

export function FleetPageClient() {
  const { accessToken, locale } = useWebSession();
  const [drivers, setDrivers] = useState<readonly FleetDriverSummary[]>([]);
  const [vehicles, setVehicles] = useState<readonly FleetVehicleSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [plateCountry, setPlateCountry] = useState("TR");
  const [equipment, setEquipment] = useState("TAUTLINER");
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignVehicleId, setAssignVehicleId] = useState("");

  const loadOverview = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const overview = await FleetApiClient.fetchOverview(accessToken, locale);
      setDrivers(overview.drivers);
      setVehicles(overview.vehicles);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Filo yüklenemedi");
    } finally {
      setIsBusy(false);
    }
  }, [accessToken, locale]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleDriverSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!accessToken || !driverName.trim()) {
      return;
    }
    setIsBusy(true);
    try {
      await FleetApiClient.createDriver(accessToken, locale, {
        displayName: driverName.trim(),
        primaryPhoneE164: driverPhone.trim() || undefined,
      });
      setDriverName("");
      setDriverPhone("");
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Şoför eklenemedi");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVehicleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!accessToken || !plate.trim()) {
      return;
    }
    setIsBusy(true);
    try {
      await FleetApiClient.createVehicle(accessToken, locale, {
        registrationCountryCode: plateCountry,
        licensePlate: plate.trim(),
        equipmentTypeCode: equipment,
      });
      setPlate("");
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Araç eklenemedi");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!accessToken || !assignDriverId || !assignVehicleId) {
      return;
    }
    setIsBusy(true);
    try {
      await FleetApiClient.assign(
        accessToken,
        locale,
        assignDriverId,
        assignVehicleId,
      );
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Eşleştirme başarısız");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="fleet-page-grid">
      {errorMessage ? (
        <p className="error banner error--light account-form-span-2">{errorMessage}</p>
      ) : null}

      <section className="account-card module-panel">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Şoförler</h2>
            <p className="account-card-lead">{drivers.length} kayıt</p>
          </div>
        </header>
        <form className="account-form-grid" onSubmit={(e) => void handleDriverSubmit(e)}>
          <label className="label-light">
            Ad soyad
            <input
              className="input-light"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              required
            />
          </label>
          <label className="label-light">
            Telefon (E.164)
            <input
              className="input-light"
              value={driverPhone}
              onChange={(event) => setDriverPhone(event.target.value)}
              placeholder="+905..."
            />
          </label>
          <button type="submit" className="btn-account-primary" disabled={isBusy}>
            Şoför ekle
          </button>
        </form>
        <ul className="fleet-entity-list">
          {drivers.map((driver) => (
            <li key={driver.driverId} className="fleet-entity-row">
              <div>
                <strong>{driver.displayName}</strong>
                <span className="fleet-entity-meta">
                  {driver.statusCode}
                  {driver.activeVehiclePlate
                    ? ` · ${driver.activeVehiclePlate}`
                    : " · Araç atanmadı"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="account-card module-panel">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Araçlar</h2>
            <p className="account-card-lead">{vehicles.length} kayıt</p>
          </div>
        </header>
        <form className="account-form-grid" onSubmit={(e) => void handleVehicleSubmit(e)}>
          <label className="label-light">
            Ülke
            <input
              className="input-light"
              maxLength={2}
              value={plateCountry}
              onChange={(event) => setPlateCountry(event.target.value.toUpperCase())}
            />
          </label>
          <label className="label-light">
            Plaka
            <input
              className="input-light"
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
              required
            />
          </label>
          <label className="label-light">
            Ekipman
            <select
              className="input-light"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
            >
              <option value="TAUTLINER">Tenteli</option>
              <option value="REFRIGERATED">Frigo</option>
              <option value="FLATBED">Açık</option>
            </select>
          </label>
          <button type="submit" className="btn-account-primary" disabled={isBusy}>
            Araç ekle
          </button>
        </form>
        <ul className="fleet-entity-list">
          {vehicles.map((vehicle) => (
            <li key={vehicle.vehicleId} className="fleet-entity-row">
              <div>
                <strong>
                  {vehicle.licensePlateDisplay} ({vehicle.registrationCountryCode})
                </strong>
                <span className="fleet-entity-meta">
                  {equipmentLabel(vehicle.equipmentTypeCode)} · {vehicle.statusCode}
                  {vehicle.activeDriverName
                    ? ` · ${vehicle.activeDriverName}`
                    : " · Şoför atanmadı"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="account-card module-panel fleet-page-grid-span">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Şoför – araç eşleştirme</h2>
            <p className="account-card-lead">
              Aktif eşleştirme geçmişi saklanır; yeni atama önceki kaydı kapatır.
            </p>
          </div>
        </header>
        <form className="account-form-grid" onSubmit={(e) => void handleAssign(e)}>
          <label className="label-light">
            Şoför
            <select
              className="input-light"
              value={assignDriverId}
              onChange={(event) => setAssignDriverId(event.target.value)}
            >
              <option value="">Seçin</option>
              {drivers.map((driver) => (
                <option key={driver.driverId} value={driver.driverId}>
                  {driver.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="label-light">
            Araç
            <select
              className="input-light"
              value={assignVehicleId}
              onChange={(event) => setAssignVehicleId(event.target.value)}
            >
              <option value="">Seçin</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.licensePlateDisplay}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-account-primary" disabled={isBusy}>
            Eşleştir
          </button>
        </form>
      </section>
    </div>
  );
}
