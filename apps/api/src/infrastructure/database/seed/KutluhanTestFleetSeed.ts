import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import {
  AuctionSessionStatusCode,
  CompanyParticipantTypeCode,
  CompanyRoleCode,
  FleetAssignmentTypeCode,
  FleetDriverStatusCode,
  FleetVehicleStatusCode,
  FreightListingKindCode,
} from "@nakliyeborsasi/core";
import { CompanyEntity } from "../entities/CompanyEntity";
import { UserAccountEntity } from "../entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "../entities/FreightListingEntity";
import { AuctionSessionEntity } from "../entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../entities/AuctionBidEntity";
import { FleetDriverEntity } from "../entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "../entities/FleetDriverVehicleAssignmentEntity";
import { normalizeLicensePlate } from "../../../modules/fleet/FleetPlateNormalization";
import { TEST_MARKET_USER_PASSWORD } from "./TestMarketParticipantSeed";

export const KUTLUHAN_TEST_OWNER_EMAIL =
  "kutluhantest@test.nakliyeborsasi.local";
export const KUTLUHAN_TEST_DRIVER_EMAIL =
  "kutluhantest-sofor@test.nakliyeborsasi.local";
export const KUTLUHAN_TEST_COMPANY_NAME = "Kutluhan Test Taşımacılık";
export const KUTLUHAN_TEST_DRIVER_PHONE_E164 = "+905546902543";

type KutluhanSeedDeps = {
  companyRepository: Repository<CompanyEntity>;
  userAccountRepository: Repository<UserAccountEntity>;
  companyMembershipRepository: Repository<CompanyMembershipEntity>;
  companySubscriptionRepository: Repository<CompanySubscriptionEntity>;
  freightListingRepository: Repository<FreightListingEntity>;
  auctionSessionRepository: Repository<AuctionSessionEntity>;
  auctionBidRepository: Repository<AuctionBidEntity>;
  driverRepository: Repository<FleetDriverEntity>;
  vehicleRepository: Repository<FleetVehicleEntity>;
  assignmentRepository: Repository<FleetDriverVehicleAssignmentEntity>;
};

export async function seedKutluhanTestFleet(deps: KutluhanSeedDeps): Promise<void> {
  const existingOwner = await deps.userAccountRepository.findOne({
    where: { emailAddress: KUTLUHAN_TEST_OWNER_EMAIL },
  });
  if (existingOwner) {
    return;
  }

  const passwordHash = await bcrypt.hash(TEST_MARKET_USER_PASSWORD, 12);
  const company = await deps.companyRepository.save(
    deps.companyRepository.create({
      legalName: KUTLUHAN_TEST_COMPANY_NAME,
      countryCode: "TR",
      participantTypeCode: CompanyParticipantTypeCode.LoadCarrier,
    }),
  );

  const ownerUser = await deps.userAccountRepository.save(
    deps.userAccountRepository.create({
      emailAddress: KUTLUHAN_TEST_OWNER_EMAIL,
      passwordHash,
      displayName: "Kutluhan Test",
    }),
  );

  await deps.companyMembershipRepository.save(
    deps.companyMembershipRepository.create({
      companyId: company.id,
      userId: ownerUser.id,
      roleCode: CompanyRoleCode.CompanyOwner,
    }),
  );

  await deps.companySubscriptionRepository.save(
    deps.companySubscriptionRepository.create({
      companyId: company.id,
      planCode: "carrier_professional_tr_ua",
      isActive: true,
    }),
  );

  const driverUser = await deps.userAccountRepository.save(
    deps.userAccountRepository.create({
      emailAddress: KUTLUHAN_TEST_DRIVER_EMAIL,
      passwordHash,
      displayName: "Kutluhan Test Şoför",
    }),
  );

  await deps.companyMembershipRepository.save(
    deps.companyMembershipRepository.create({
      companyId: company.id,
      userId: driverUser.id,
      roleCode: CompanyRoleCode.FleetDriver,
    }),
  );

  const truckActive = await deps.vehicleRepository.save(
    deps.vehicleRepository.create({
      companyId: company.id,
      registrationCountryCode: "TR",
      licensePlateDisplay: "34 KT 2026",
      licensePlateNormalized: normalizeLicensePlate("34 KT 2026"),
      vin: "VF1KT2026001",
      equipmentTypeCode: "TAUTLINER",
      payloadCapacityTonnes: "24.00",
      statusCode: FleetVehicleStatusCode.Dispatched,
      internalFleetNumber: "KT-01",
      activeDriverId: null,
    }),
  );

  const truckIdle = await deps.vehicleRepository.save(
    deps.vehicleRepository.create({
      companyId: company.id,
      registrationCountryCode: "TR",
      licensePlateDisplay: "06 KT 1188",
      licensePlateNormalized: normalizeLicensePlate("06 KT 1188"),
      equipmentTypeCode: "REFRIGERATED",
      payloadCapacityTonnes: "20.00",
      statusCode: FleetVehicleStatusCode.Available,
      internalFleetNumber: "KT-02",
      activeDriverId: null,
    }),
  );

  const driverActive = await deps.driverRepository.save(
    deps.driverRepository.create({
      companyId: company.id,
      displayName: "Kutluhan Test Şoför",
      primaryPhoneE164: KUTLUHAN_TEST_DRIVER_PHONE_E164,
      driverLicenseNumber: "TR-KT-2026",
      driverLicenseCountryCode: "TR",
      statusCode: FleetDriverStatusCode.Active,
      linkedUserAccountId: driverUser.id,
      activeVehicleId: truckActive.id,
    }),
  );

  const driverBench = await deps.driverRepository.save(
    deps.driverRepository.create({
      companyId: company.id,
      displayName: "Yedek Şoför Demir",
      primaryPhoneE164: "+905559876543",
      driverLicenseNumber: "TR-YD-9912",
      driverLicenseCountryCode: "TR",
      statusCode: FleetDriverStatusCode.Active,
      linkedUserAccountId: null,
      activeVehicleId: null,
    }),
  );

  truckActive.activeDriverId = driverActive.id;
  await deps.vehicleRepository.save(truckActive);

  const now = Date.now();
  const activeFrom = new Date(now - 2 * 24 * 60 * 60 * 1000);
  await deps.assignmentRepository.save(
    deps.assignmentRepository.create({
      companyId: company.id,
      driverId: driverActive.id,
      vehicleId: truckActive.id,
      assignmentTypeCode: FleetAssignmentTypeCode.Primary,
      validFrom: activeFrom,
      validTo: null,
    }),
  );

  const completedFrom = new Date(now - 21 * 24 * 60 * 60 * 1000);
  const completedTo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  await deps.assignmentRepository.save(
    deps.assignmentRepository.create({
      companyId: company.id,
      driverId: driverBench.id,
      vehicleId: truckIdle.id,
      assignmentTypeCode: FleetAssignmentTypeCode.Temporary,
      validFrom: completedFrom,
      validTo: completedTo,
    }),
  );

  const capacityOngoing = await deps.freightListingRepository.save(
    deps.freightListingRepository.create({
      ownerCompanyId: company.id,
      originCountryCode: "TR",
      originCityName: "Ankara",
      originPlaceName: "Ostim çıkış",
      destinationCountryCode: "UA",
      destinationCityName: "Odesa",
      destinationPlaceName: "Serbest bölge",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "22.00",
      loadingDateStart: "2026-09-25",
      priceAmount: "2100.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
      listingKindCode: FreightListingKindCode.CapacityOffer,
      assignedFleetVehicleId: truckActive.id,
      assignedFleetDriverId: driverActive.id,
    }),
  );

  const capacityDone = await deps.freightListingRepository.save(
    deps.freightListingRepository.create({
      ownerCompanyId: company.id,
      originCountryCode: "TR",
      originCityName: "İstanbul",
      destinationCountryCode: "DE",
      destinationCityName: "Berlin",
      equipmentTypeCode: "TAUTLINER",
      weightTonnes: "21.00",
      loadingDateStart: "2026-09-05",
      priceAmount: "2350.00",
      priceCurrencyCode: "EUR",
      marketScopeCode: "UA_EU",
      listingKindCode: FreightListingKindCode.CapacityOffer,
      assignedFleetVehicleId: truckIdle.id,
      assignedFleetDriverId: driverBench.id,
    }),
  );

  const auctionEnds = new Date(now - 3 * 24 * 60 * 60 * 1000);
  const closedSession = await deps.auctionSessionRepository.save(
    deps.auctionSessionRepository.create({
      freightListingId: capacityDone.id,
      ownerCompanyId: company.id,
      statusCode: AuctionSessionStatusCode.Closed,
      endsAt: auctionEnds,
      minimumBidAmount: "2200.00",
      currencyCode: "EUR",
      winningBidId: null,
      auctionTypeCode: "REVERSE_OPEN",
      assignedFleetVehicleId: truckIdle.id,
      assignedFleetDriverId: driverBench.id,
      fleetOperatorCompanyId: company.id,
      cargoDescription: "Tamamlanan demo sefer — Berlin koridoru",
    }),
  );

  const bid = await deps.auctionBidRepository.save(
    deps.auctionBidRepository.create({
      auctionSessionId: closedSession.id,
      bidderCompanyId: company.id,
      bidAmount: "2180.00",
    }),
  );
  closedSession.winningBidId = bid.id;
  await deps.auctionSessionRepository.save(closedSession);

  const openEnds = new Date(now + 5 * 24 * 60 * 60 * 1000);
  const openSession = await deps.auctionSessionRepository.save(
    deps.auctionSessionRepository.create({
      freightListingId: capacityOngoing.id,
      ownerCompanyId: company.id,
      statusCode: AuctionSessionStatusCode.Open,
      endsAt: openEnds,
      minimumBidAmount: "2000.00",
      currencyCode: "EUR",
      winningBidId: null,
      auctionTypeCode: "REVERSE_OPEN",
      assignedFleetVehicleId: truckActive.id,
      assignedFleetDriverId: driverActive.id,
      fleetOperatorCompanyId: company.id,
      cargoDescription: "Devam eden Odesa kapasite ihale bağlantısı",
    }),
  );

  await deps.auctionBidRepository.save(
    deps.auctionBidRepository.create({
      auctionSessionId: openSession.id,
      bidderCompanyId: company.id,
      bidAmount: "1950.00",
    }),
  );
}

export async function patchKutluhanTestDriverPhone(
  userAccountRepository: Repository<UserAccountEntity>,
  driverRepository: Repository<FleetDriverEntity>,
): Promise<void> {
  const driverUser = await userAccountRepository.findOne({
    where: { emailAddress: KUTLUHAN_TEST_DRIVER_EMAIL },
  });
  if (!driverUser) {
    return;
  }
  const driver = await driverRepository.findOne({
    where: { linkedUserAccountId: driverUser.id },
  });
  if (!driver) {
    return;
  }
  if (driver.primaryPhoneE164 !== KUTLUHAN_TEST_DRIVER_PHONE_E164) {
    driver.primaryPhoneE164 = KUTLUHAN_TEST_DRIVER_PHONE_E164;
    await driverRepository.save(driver);
  }
}
