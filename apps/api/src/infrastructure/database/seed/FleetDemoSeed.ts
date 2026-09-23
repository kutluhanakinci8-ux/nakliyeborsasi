import { Repository } from "typeorm";
import {
  CompanyParticipantTypeCode,
  FleetAssignmentTypeCode,
  FleetDriverStatusCode,
  FleetVehicleStatusCode,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../entities/CompanyEntity";
import { FleetDriverEntity } from "../entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "../entities/FleetDriverVehicleAssignmentEntity";
import { normalizeLicensePlate } from "../../../modules/fleet/FleetPlateNormalization";

type FleetDemoSeedDeps = {
  companyRepository: Repository<CompanyEntity>;
  driverRepository: Repository<FleetDriverEntity>;
  vehicleRepository: Repository<FleetVehicleEntity>;
  assignmentRepository: Repository<FleetDriverVehicleAssignmentEntity>;
};

export async function seedFleetDemoGraph(deps: FleetDemoSeedDeps): Promise<void> {
  const carrier = await deps.companyRepository.findOne({
    where: {
      legalName: "Atlas Taşımacılık A.Ş.",
      participantTypeCode: CompanyParticipantTypeCode.LoadCarrier,
    },
  });
  if (!carrier) {
    return;
  }
  const existingDrivers = await deps.driverRepository.count({
    where: { companyId: carrier.id },
  });
  if (existingDrivers > 0) {
    return;
  }
  const truckOne = await deps.vehicleRepository.save(
    deps.vehicleRepository.create({
      companyId: carrier.id,
      registrationCountryCode: "TR",
      licensePlateDisplay: "34 NB 4821",
      licensePlateNormalized: normalizeLicensePlate("34 NB 4821"),
      vin: "VF1MA0000NB482100",
      equipmentTypeCode: "TAUTLINER",
      payloadCapacityTonnes: "24.00",
      statusCode: FleetVehicleStatusCode.Dispatched,
      internalFleetNumber: "AT-01",
      activeDriverId: null,
    }),
  );
  const truckTwo = await deps.vehicleRepository.save(
    deps.vehicleRepository.create({
      companyId: carrier.id,
      registrationCountryCode: "TR",
      licensePlateDisplay: "06 KOR 119",
      licensePlateNormalized: normalizeLicensePlate("06 KOR 119"),
      vin: null,
      equipmentTypeCode: "REFRIGERATED",
      payloadCapacityTonnes: "20.00",
      statusCode: FleetVehicleStatusCode.Available,
      internalFleetNumber: "AT-02",
      activeDriverId: null,
    }),
  );
  const driverOne = await deps.driverRepository.save(
    deps.driverRepository.create({
      companyId: carrier.id,
      displayName: "Mehmet Yılmaz",
      primaryPhoneE164: "+905551112233",
      driverLicenseNumber: "TR-DL-88421",
      driverLicenseCountryCode: "TR",
      statusCode: FleetDriverStatusCode.Active,
      linkedUserAccountId: null,
      activeVehicleId: truckOne.id,
    }),
  );
  const driverTwo = await deps.driverRepository.save(
    deps.driverRepository.create({
      companyId: carrier.id,
      displayName: "Oleksandr Koval",
      primaryPhoneE164: "+380501234567",
      driverLicenseNumber: "UA-BC-99201",
      driverLicenseCountryCode: "UA",
      statusCode: FleetDriverStatusCode.Active,
      linkedUserAccountId: null,
      activeVehicleId: null,
    }),
  );
  truckOne.activeDriverId = driverOne.id;
  await deps.vehicleRepository.save(truckOne);
  const validFrom = new Date();
  await deps.assignmentRepository.save(
    deps.assignmentRepository.create({
      companyId: carrier.id,
      driverId: driverOne.id,
      vehicleId: truckOne.id,
      assignmentTypeCode: FleetAssignmentTypeCode.Primary,
      validFrom,
      validTo: null,
    }),
  );
  void truckTwo;
  void driverTwo;
}
