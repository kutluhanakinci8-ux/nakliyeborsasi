import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  GeographicMarketCode,
  PlatformFreightListing,
} from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { PlatformFreightListingMapper } from "./PlatformFreightListingMapper";

@Injectable()
export class PlatformFreightListingRepository {
  public constructor(
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
  ) {}

  public async saveListing(
    listing: PlatformFreightListing,
  ): Promise<PlatformFreightListing> {
    const entity = this.freightListingRepository.create({
      id: listing.listingId,
      ownerCompanyId: listing.ownerCompanyId,
      originCountryCode: listing.origin.countryCode,
      originCityName: listing.origin.cityName,
      originPlaceName: listing.origin.placeName,
      originPlaceKindCode: listing.origin.placeKindCode,
      destinationCountryCode: listing.destination.countryCode,
      destinationCityName: listing.destination.cityName,
      destinationPlaceName: listing.destination.placeName,
      destinationPlaceKindCode: listing.destination.placeKindCode,
      equipmentTypeCode: listing.equipmentType,
      weightTonnes: listing.weightTonnes.toFixed(2),
      loadingDateStart: listing.loadingDateStart,
      priceAmount:
        listing.price === null ? null : listing.price.amount.toFixed(2),
      priceCurrencyCode:
        listing.price === null ? null : listing.price.currencyCode,
      marketScopeCode: listing.marketScope,
    });
    const saved = await this.freightListingRepository.save(entity);
    return PlatformFreightListingMapper.toDomain(saved);
  }

  public async findById(listingId: string): Promise<PlatformFreightListing | null> {
    const entity = await this.freightListingRepository.findOne({
      where: { id: listingId },
    });
    return entity ? PlatformFreightListingMapper.toDomain(entity) : null;
  }

  public async search(
    originCountryCode: string | null,
    destinationCountryCode: string | null,
    marketScope: GeographicMarketCode | null,
  ): Promise<readonly PlatformFreightListing[]> {
    const queryBuilder =
      this.freightListingRepository.createQueryBuilder("listing");
    if (originCountryCode) {
      queryBuilder.andWhere("listing.originCountryCode = :originCountryCode", {
        originCountryCode,
      });
    }
    if (destinationCountryCode) {
      queryBuilder.andWhere(
        "listing.destinationCountryCode = :destinationCountryCode",
        { destinationCountryCode },
      );
    }
    if (marketScope) {
      queryBuilder.andWhere("listing.marketScopeCode = :marketScope", {
        marketScope,
      });
    }
    const entities = await queryBuilder.getMany();
    return entities.map((entity) =>
      PlatformFreightListingMapper.toDomain(entity),
    );
  }

  public createListingId(): string {
    return randomUUID();
  }
}
