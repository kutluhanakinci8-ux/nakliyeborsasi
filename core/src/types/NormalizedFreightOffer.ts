import { EquipmentTypeCode } from "../constants/EquipmentTypeCode";
import { GeographicMarketCode } from "../constants/GeographicMarketCode";

export class MoneyAmount {
  public readonly amount: number;

  public readonly currencyCode: string;

  public constructor(amount: number, currencyCode: string) {
    this.amount = amount;
    this.currencyCode = currencyCode;
  }
}

export class RouteEndpoint {
  public readonly countryCode: string;

  public readonly cityName: string;

  public readonly regionCode: string | null;

  /** Liman, terminal, depo veya teslimat noktası adı (şehirden daha spesifik). */
  public readonly placeName: string | null;

  /** FreightPlaceKindCode — CITY, PORT, TERMINAL, … */
  public readonly placeKindCode: string | null;

  public constructor(
    countryCode: string,
    cityName: string,
    regionCode: string | null = null,
    placeName: string | null = null,
    placeKindCode: string | null = null,
  ) {
    this.countryCode = countryCode;
    this.cityName = cityName;
    this.regionCode = regionCode;
    this.placeName = placeName;
    this.placeKindCode = placeKindCode;
  }
}

export class FreightDimensions {
  public readonly weightTonnes: number;

  public readonly volumeCubicMeters: number | null;

  public constructor(weightTonnes: number, volumeCubicMeters: number | null) {
    this.weightTonnes = weightTonnes;
    this.volumeCubicMeters = volumeCubicMeters;
  }
}

export class NormalizedFreightOffer {
  public readonly externalReferenceId: string;

  public readonly providerCode: string;

  public readonly origin: RouteEndpoint;

  public readonly destination: RouteEndpoint;

  public readonly equipmentType: EquipmentTypeCode;

  public readonly dimensions: FreightDimensions;

  public readonly loadingDateStart: string;

  public readonly loadingDateEnd: string | null;

  public readonly price: MoneyAmount | null;

  public readonly marketScope: GeographicMarketCode;

  public readonly rawPayloadDigest: string;

  public constructor(params: {
    externalReferenceId: string;
    providerCode: string;
    origin: RouteEndpoint;
    destination: RouteEndpoint;
    equipmentType: EquipmentTypeCode;
    dimensions: FreightDimensions;
    loadingDateStart: string;
    loadingDateEnd: string | null;
    price: MoneyAmount | null;
    marketScope: GeographicMarketCode;
    rawPayloadDigest: string;
  }) {
    this.externalReferenceId = params.externalReferenceId;
    this.providerCode = params.providerCode;
    this.origin = params.origin;
    this.destination = params.destination;
    this.equipmentType = params.equipmentType;
    this.dimensions = params.dimensions;
    this.loadingDateStart = params.loadingDateStart;
    this.loadingDateEnd = params.loadingDateEnd;
    this.price = params.price;
    this.marketScope = params.marketScope;
    this.rawPayloadDigest = params.rawPayloadDigest;
  }
}
