import {
  FleetAssignmentSummary,
  FleetDriverSummary,
  FleetMovementSummary,
  FleetOverviewSnapshot,
  FleetVehicleSummary,
} from "@nakliyeborsasi/core";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetDriverVehicleAssignmentEntity } from "../../infrastructure/database/entities/FleetDriverVehicleAssignmentEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";

export class FleetMapper {
  public static toDriverSummary(
    driver: FleetDriverEntity,
    vehiclePlate: string | null,
  ): FleetDriverSummary {
    return {
      driverId: driver.id,
      companyId: driver.companyId,
      displayName: driver.displayName,
      primaryPhoneE164: driver.primaryPhoneE164,
      driverLicenseNumber: driver.driverLicenseNumber,
      driverLicenseCountryCode: driver.driverLicenseCountryCode,
      statusCode: driver.statusCode,
      linkedUserAccountId: driver.linkedUserAccountId,
      activeVehicleId: driver.activeVehicleId,
      activeVehiclePlate: vehiclePlate,
    };
  }

  public static toVehicleSummary(
    vehicle: FleetVehicleEntity,
    driverName: string | null,
  ): FleetVehicleSummary {
    const payload =
      vehicle.payloadCapacityTonnes !== null
        ? Number.parseFloat(vehicle.payloadCapacityTonnes)
        : null;
    return {
      vehicleId: vehicle.id,
      companyId: vehicle.companyId,
      registrationCountryCode: vehicle.registrationCountryCode,
      licensePlateDisplay: vehicle.licensePlateDisplay,
      vin: vehicle.vin,
      equipmentTypeCode: vehicle.equipmentTypeCode,
      payloadCapacityTonnes: Number.isFinite(payload) ? payload : null,
      statusCode: vehicle.statusCode,
      internalFleetNumber: vehicle.internalFleetNumber,
      activeDriverId: vehicle.activeDriverId,
      activeDriverName: driverName,
    };
  }

  public static toAssignmentSummary(
    row: FleetDriverVehicleAssignmentEntity,
    driverName: string,
    plate: string,
  ): FleetAssignmentSummary {
    return {
      assignmentId: row.id,
      driverId: row.driverId,
      vehicleId: row.vehicleId,
      assignmentTypeCode: row.assignmentTypeCode,
      validFrom: row.validFrom.toISOString(),
      validTo: row.validTo ? row.validTo.toISOString() : null,
    };
  }

  public static toOverview(
    drivers: readonly FleetDriverSummary[],
    vehicles: readonly FleetVehicleSummary[],
    activeAssignmentCount: number,
    assignments: readonly FleetAssignmentSummary[],
    movements: readonly FleetMovementSummary[],
  ): FleetOverviewSnapshot {
    return {
      driverCount: drivers.length,
      vehicleCount: vehicles.length,
      activeAssignmentCount,
      drivers,
      vehicles,
      assignments,
      movements,
    };
  }
}
