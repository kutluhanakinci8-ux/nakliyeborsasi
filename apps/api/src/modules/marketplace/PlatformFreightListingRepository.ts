import { Injectable } from "@nestjs/common";
import {
  EquipmentTypeCode,
  GeographicMarketCode,
  MoneyAmount,
  PlatformFreightListing,
  RouteEndpoint,
} from "@nakliyeborsasi/core";
import { randomUUID } from "crypto";

@Injectable()
export class PlatformFreightListingRepository {
  private readonly listings: Map<string, PlatformFreightListing> = new Map();

  public constructor() {
    this.seedDemoListings();
  }

  public saveListing(listing: PlatformFreightListing): PlatformFreightListing {
    this.listings.set(listing.listingId, listing);
    return listing;
  }

  public findById(listingId: string): PlatformFreightListing | null {
    return this.listings.get(listingId) ?? null;
  }

  public search(
    originCountryCode: string | null,
    destinationCountryCode: string | null,
    marketScope: GeographicMarketCode | null,
  ): readonly PlatformFreightListing[] {
    return [...this.listings.values()].filter((listing) => {
      if (
        originCountryCode &&
        listing.origin.countryCode !== originCountryCode
      ) {
        return false;
      }
      if (
        destinationCountryCode &&
        listing.destination.countryCode !== destinationCountryCode
      ) {
        return false;
      }
      if (marketScope && listing.marketScope !== marketScope) {
        return false;
      }
      return true;
    });
  }

  public createListingId(): string {
    return randomUUID();
  }

  private seedDemoListings(): void {
    const demoListing = new PlatformFreightListing({
      listingId: this.createListingId(),
      ownerCompanyId: "demo-company-001",
      origin: new RouteEndpoint("TR", "Ankara"),
      destination: new RouteEndpoint("UA", "Odesa"),
      equipmentType: EquipmentTypeCode.Tautliner,
      weightTonnes: 21,
      loadingDateStart: "2026-09-22",
      price: new MoneyAmount(2100, "EUR"),
      marketScope: GeographicMarketCode.EuropeanUnionCorridor,
    });
    this.saveListing(demoListing);
  }
}
