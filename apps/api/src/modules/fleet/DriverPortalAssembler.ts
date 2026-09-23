import {
  DriverPortalDutyStatus,
  DriverPortalEarnings,
  DriverPortalJob,
  DriverPortalJobPhase,
  DriverPortalSnapshot,
} from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";

export class DriverPortalAssembler {
  public static assemble(params: {
    driver: FleetDriverEntity;
    company: CompanyEntity | null;
    vehicle: FleetVehicleEntity | null;
    listings: readonly FreightListingEntity[];
    auctions: readonly AuctionSessionEntity[];
    listingById: ReadonlyMap<string, FreightListingEntity>;
  }): DriverPortalSnapshot {
    const todayIso = new Date().toISOString().slice(0, 10);
    const jobs: DriverPortalJob[] = [];

    for (const listing of params.listings) {
      jobs.push(this.jobFromListing(listing, todayIso));
    }
    for (const session of params.auctions) {
      const routeListing =
        params.listingById.get(session.freightListingId) ?? null;
      jobs.push(this.jobFromAuction(session, routeListing, todayIso));
    }

    jobs.sort(
      (a, b) =>
        new Date(b.loadingDateStart).getTime() -
        new Date(a.loadingDateStart).getTime(),
    );

    const activeJob = jobs.find((job) => job.phase === "ACTIVE") ?? null;
    const earnings = this.computeEarnings(jobs, todayIso);
    const dutyStatus = this.resolveDutyStatus(
      params.driver,
      params.vehicle,
      activeJob,
    );

    return {
      driver: {
        driverId: params.driver.id,
        displayName: params.driver.displayName,
        statusCode: params.driver.statusCode,
        primaryPhoneE164: params.driver.primaryPhoneE164,
        activeVehiclePlate: params.vehicle?.licensePlateDisplay ?? null,
      },
      company: params.company
        ? {
            companyId: params.company.id,
            legalName: params.company.legalName,
            countryCode: params.company.countryCode,
          }
        : null,
      activeVehicle: params.vehicle
        ? {
            vehicleId: params.vehicle.id,
            licensePlateDisplay: params.vehicle.licensePlateDisplay,
            equipmentTypeCode: params.vehicle.equipmentTypeCode,
            statusCode: params.vehicle.statusCode,
          }
        : null,
      dutyStatus,
      earnings,
      activeJob,
      jobs,
    };
  }

  private static jobFromListing(
    listing: FreightListingEntity,
    todayIso: string,
  ): DriverPortalJob {
    const phase: DriverPortalJobPhase =
      listing.loadingDateStart >= todayIso ? "ACTIVE" : "COMPLETED";
    const revenueAmount =
      listing.priceAmount !== null
        ? Number.parseFloat(listing.priceAmount)
        : null;
    return {
      jobId: listing.id,
      kind: "LISTING",
      phase,
      originCityName: listing.originCityName,
      originCountryCode: listing.originCountryCode,
      destinationCityName: listing.destinationCityName,
      destinationCountryCode: listing.destinationCountryCode,
      loadingDateStart: listing.loadingDateStart,
      completedAt: phase === "COMPLETED" ? listing.loadingDateStart : null,
      revenueAmount: Number.isFinite(revenueAmount) ? revenueAmount : null,
      revenueCurrencyCode: listing.priceCurrencyCode,
      statusLabel:
        phase === "ACTIVE" ? "Yükleme / teslimat devam ediyor" : "Teslim edildi",
      cargoLabel: `${listing.equipmentTypeCode} · ${listing.weightTonnes} t`,
    };
  }

  private static jobFromAuction(
    session: AuctionSessionEntity,
    listing: FreightListingEntity | null,
    todayIso: string,
  ): DriverPortalJob {
    const phase: DriverPortalJobPhase =
      session.statusCode === "OPEN" ? "ACTIVE" : "COMPLETED";
    const revenueAmount = Number.parseFloat(session.minimumBidAmount);
    const loadingDate =
      listing?.loadingDateStart ?? session.endsAt.toISOString().slice(0, 10);
    return {
      jobId: session.id,
      kind: "AUCTION",
      phase,
      originCityName: listing?.originCityName ?? "—",
      originCountryCode: listing?.originCountryCode ?? "—",
      destinationCityName: listing?.destinationCityName ?? "—",
      destinationCountryCode: listing?.destinationCountryCode ?? "—",
      loadingDateStart: loadingDate,
      completedAt:
        phase === "COMPLETED" ? session.endsAt.toISOString().slice(0, 10) : null,
      revenueAmount: Number.isFinite(revenueAmount) ? revenueAmount : null,
      revenueCurrencyCode: session.currencyCode,
      statusLabel:
        phase === "ACTIVE"
          ? "İhale seferi — yolda"
          : session.cargoDescription ?? "İhale tamamlandı",
      cargoLabel: listing
        ? `${listing.equipmentTypeCode} · ${listing.weightTonnes} t`
        : session.cargoDescription,
    };
  }

  private static computeEarnings(
    jobs: readonly DriverPortalJob[],
    todayIso: string,
  ): DriverPortalEarnings {
    const monthPrefix = todayIso.slice(0, 7);
    const yearPrefix = todayIso.slice(0, 4);
    let monthToDateAmount = 0;
    let yearToDateAmount = 0;
    let completedTripCount = 0;
    let pendingTripCount = 0;
    let currencyCode = "EUR";

    for (const job of jobs) {
      if (job.phase === "ACTIVE") {
        pendingTripCount++;
        continue;
      }
      completedTripCount++;
      const amount = job.revenueAmount ?? 0;
      if (job.revenueCurrencyCode) {
        currencyCode = job.revenueCurrencyCode;
      }
      const dateKey = job.completedAt ?? job.loadingDateStart;
      if (dateKey.startsWith(monthPrefix)) {
        monthToDateAmount += amount;
      }
      if (dateKey.startsWith(yearPrefix)) {
        yearToDateAmount += amount;
      }
    }

    return {
      currencyCode,
      monthToDateAmount,
      yearToDateAmount,
      completedTripCount,
      pendingTripCount,
    };
  }

  private static resolveDutyStatus(
    driver: FleetDriverEntity,
    vehicle: FleetVehicleEntity | null,
    activeJob: DriverPortalJob | null,
  ): DriverPortalDutyStatus {
    if (driver.statusCode === "INACTIVE" || driver.statusCode === "ON_LEAVE") {
      return "OFF";
    }
    if (activeJob || vehicle?.statusCode === "DISPATCHED") {
      return "ON_DUTY";
    }
    return "AVAILABLE";
  }
}
