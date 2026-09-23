export type FleetDriverSummary = {
  driverId: string;
  companyId: string;
  displayName: string;
  primaryPhoneE164: string | null;
  driverLicenseNumber: string | null;
  driverLicenseCountryCode: string | null;
  statusCode: string;
  linkedUserAccountId: string | null;
  activeVehicleId: string | null;
  activeVehiclePlate: string | null;
};

export type FleetVehicleSummary = {
  vehicleId: string;
  companyId: string;
  registrationCountryCode: string;
  licensePlateDisplay: string;
  vin: string | null;
  equipmentTypeCode: string;
  payloadCapacityTonnes: number | null;
  statusCode: string;
  internalFleetNumber: string | null;
  activeDriverId: string | null;
  activeDriverName: string | null;
};

export type FleetAssignmentSummary = {
  assignmentId: string;
  driverId: string;
  vehicleId: string;
  assignmentTypeCode: string;
  validFrom: string;
  validTo: string | null;
};

export type FleetOverviewSnapshot = {
  driverCount: number;
  vehicleCount: number;
  activeAssignmentCount: number;
  drivers: readonly FleetDriverSummary[];
  vehicles: readonly FleetVehicleSummary[];
};
