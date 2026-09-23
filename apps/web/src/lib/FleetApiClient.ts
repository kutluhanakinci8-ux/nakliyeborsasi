import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type FleetDriverSummary = {
  driverId: string;
  displayName: string;
  statusCode: string;
  activeVehiclePlate: string | null;
};

export type FleetVehicleSummary = {
  vehicleId: string;
  licensePlateDisplay: string;
  registrationCountryCode: string;
  equipmentTypeCode: string;
  statusCode: string;
  activeDriverName: string | null;
};

export type FleetOverviewSnapshot = {
  driverCount: number;
  vehicleCount: number;
  drivers: readonly FleetDriverSummary[];
  vehicles: readonly FleetVehicleSummary[];
};

export class FleetApiClient {
  private static authHeaders(accessToken: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  public static async fetchOverview(
    accessToken: string,
    locale: string,
  ): Promise<FleetOverviewSnapshot> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/overview?lang=${locale}`,
      { headers: this.authHeaders(accessToken) },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { overview: FleetOverviewSnapshot };
    return payload.overview;
  }

  public static async createDriver(
    accessToken: string,
    locale: string,
    body: {
      displayName: string;
      primaryPhoneE164?: string;
      driverLicenseNumber?: string;
      driverLicenseCountryCode?: string;
    },
  ): Promise<void> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/drivers?lang=${locale}`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  public static async createVehicle(
    accessToken: string,
    locale: string,
    body: {
      registrationCountryCode: string;
      licensePlate: string;
      equipmentTypeCode: string;
      vin?: string;
      payloadCapacityTonnes?: number;
      internalFleetNumber?: string;
    },
  ): Promise<void> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/vehicles?lang=${locale}`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }

  public static async assign(
    accessToken: string,
    locale: string,
    driverId: string,
    vehicleId: string,
  ): Promise<void> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/assignments?lang=${locale}`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
        body: JSON.stringify({ driverId, vehicleId }),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}
