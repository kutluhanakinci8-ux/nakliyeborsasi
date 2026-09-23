export type DriverPortalDutyStatus = "ON_DUTY" | "AVAILABLE" | "OFF";

export type DriverPortalJobPhase = "ACTIVE" | "COMPLETED";

export type DriverPortalJob = {
  jobId: string;
  kind: "LISTING" | "AUCTION";
  phase: DriverPortalJobPhase;
  originCityName: string;
  originCountryCode: string;
  destinationCityName: string;
  destinationCountryCode: string;
  loadingDateStart: string;
  completedAt: string | null;
  revenueAmount: number | null;
  revenueCurrencyCode: string | null;
  statusLabel: string;
  cargoLabel: string | null;
};

export type DriverPortalEarnings = {
  currencyCode: string;
  monthToDateAmount: number;
  yearToDateAmount: number;
  completedTripCount: number;
  pendingTripCount: number;
};

export type DriverPortalSnapshot = {
  driver: {
    driverId: string;
    displayName: string;
    statusCode: string;
    primaryPhoneE164: string | null;
    activeVehiclePlate: string | null;
  };
  company: {
    companyId: string;
    legalName: string;
    countryCode: string;
  } | null;
  activeVehicle: {
    vehicleId: string;
    licensePlateDisplay: string;
    equipmentTypeCode: string;
    statusCode: string;
  } | null;
  dutyStatus: DriverPortalDutyStatus;
  earnings: DriverPortalEarnings;
  activeJob: DriverPortalJob | null;
  jobs: readonly DriverPortalJob[];
};
