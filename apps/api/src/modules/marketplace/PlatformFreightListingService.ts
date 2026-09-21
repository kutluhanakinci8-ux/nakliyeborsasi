import { Injectable } from "@nestjs/common";
import {
  GeographicMarketCode,
  MoneyAmount,
  PlatformFreightListing,
  RouteEndpoint,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { PlatformFreightListingRepository } from "./PlatformFreightListingRepository";
import { CreatePlatformFreightListingDto } from "./CreatePlatformFreightListingDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";

@Injectable()
export class PlatformFreightListingService {
  public constructor(
    private readonly platformFreightListingRepository: PlatformFreightListingRepository,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  public async createListing(
    companyId: string,
    payload: CreatePlatformFreightListingDto,
    locale: string,
  ): Promise<PlatformFreightListing> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      companyId,
      SubscriptionModuleCode.MarketplaceSearch,
      locale,
    );
    const price =
      payload.priceAmount !== undefined &&
      payload.priceCurrency !== undefined
        ? new MoneyAmount(payload.priceAmount, payload.priceCurrency)
        : null;
    const listing = new PlatformFreightListing({
      listingId: this.platformFreightListingRepository.createListingId(),
      ownerCompanyId: companyId,
      origin: new RouteEndpoint(
        payload.originCountryCode,
        payload.originCityName,
      ),
      destination: new RouteEndpoint(
        payload.destinationCountryCode,
        payload.destinationCityName,
      ),
      equipmentType: payload.equipmentType,
      weightTonnes: payload.weightTonnes,
      loadingDateStart: payload.loadingDateStart,
      price,
      marketScope: payload.marketScope,
    });
    return this.platformFreightListingRepository.saveListing(listing);
  }

  public async searchListings(
    companyId: string,
    originCountryCode: string | null,
    destinationCountryCode: string | null,
    marketScope: GeographicMarketCode | null,
    locale: string,
  ): Promise<readonly PlatformFreightListing[]> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      companyId,
      SubscriptionModuleCode.MarketplaceSearch,
      locale,
    );
    return this.platformFreightListingRepository.search(
      originCountryCode,
      destinationCountryCode,
      marketScope,
    );
  }

  public translateSuccess(locale: string): string {
    return this.localeResolutionService.translate(
      locale,
      "marketplace.search_success",
    );
  }
}
