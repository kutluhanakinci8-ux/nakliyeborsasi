import { EquipmentTypeCode } from "../constants/EquipmentTypeCode";
import { GeographicMarketCode } from "../constants/GeographicMarketCode";
import { MoneyAmount } from "./NormalizedFreightOffer";
import { RouteEndpoint } from "./NormalizedFreightOffer";

export class ExternalFreightSearchCriteria {
  public readonly originCountryCode: string | null;

  public readonly destinationCountryCode: string | null;

  public readonly originCityQuery: string | null;

  public readonly destinationCityQuery: string | null;

  public readonly equipmentType: EquipmentTypeCode | null;

  public readonly minimumWeightTonnes: number | null;

  public readonly marketScope: GeographicMarketCode | null;

  public readonly limit: number;

  public constructor(params: {
    originCountryCode: string | null;
    destinationCountryCode: string | null;
    originCityQuery: string | null;
    destinationCityQuery: string | null;
    equipmentType: EquipmentTypeCode | null;
    minimumWeightTonnes: number | null;
    marketScope: GeographicMarketCode | null;
    limit: number;
  }) {
    this.originCountryCode = params.originCountryCode;
    this.destinationCountryCode = params.destinationCountryCode;
    this.originCityQuery = params.originCityQuery;
    this.destinationCityQuery = params.destinationCityQuery;
    this.equipmentType = params.equipmentType;
    this.minimumWeightTonnes = params.minimumWeightTonnes;
    this.marketScope = params.marketScope;
    this.limit = params.limit;
  }
}

export class PlatformFreightListing {
  public readonly listingId: string;

  public readonly ownerCompanyId: string;

  public readonly origin: RouteEndpoint;

  public readonly destination: RouteEndpoint;

  public readonly equipmentType: EquipmentTypeCode;

  public readonly weightTonnes: number;

  public readonly loadingDateStart: string;

  public readonly price: MoneyAmount | null;

  public readonly marketScope: GeographicMarketCode;

  public constructor(params: {
    listingId: string;
    ownerCompanyId: string;
    origin: RouteEndpoint;
    destination: RouteEndpoint;
    equipmentType: EquipmentTypeCode;
    weightTonnes: number;
    loadingDateStart: string;
    price: MoneyAmount | null;
    marketScope: GeographicMarketCode;
  }) {
    this.listingId = params.listingId;
    this.ownerCompanyId = params.ownerCompanyId;
    this.origin = params.origin;
    this.destination = params.destination;
    this.equipmentType = params.equipmentType;
    this.weightTonnes = params.weightTonnes;
    this.loadingDateStart = params.loadingDateStart;
    this.price = params.price;
    this.marketScope = params.marketScope;
  }
}
