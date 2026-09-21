import {
  EquipmentTypeCode,
  GeographicMarketCode,
  MoneyAmount,
  PlatformFreightListing,
  RouteEndpoint,
} from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";

export class PlatformFreightListingMapper {
  public static toDomain(entity: FreightListingEntity): PlatformFreightListing {
    const price =
      entity.priceAmount !== null && entity.priceCurrencyCode !== null
        ? new MoneyAmount(
            Number(entity.priceAmount),
            entity.priceCurrencyCode,
          )
        : null;
    return new PlatformFreightListing({
      listingId: entity.id,
      ownerCompanyId: entity.ownerCompanyId,
      origin: new RouteEndpoint(
        entity.originCountryCode,
        entity.originCityName,
      ),
      destination: new RouteEndpoint(
        entity.destinationCountryCode,
        entity.destinationCityName,
      ),
      equipmentType: entity.equipmentTypeCode as EquipmentTypeCode,
      weightTonnes: Number(entity.weightTonnes),
      loadingDateStart: entity.loadingDateStart,
      price,
      marketScope: entity.marketScopeCode as GeographicMarketCode,
    });
  }
}
