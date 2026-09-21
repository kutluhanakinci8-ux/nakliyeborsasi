import { Injectable } from "@nestjs/common";
import {
  EquipmentTypeCode,
  ExternalFreightSearchCriteria,
  GeographicMarketCode,
  IntegrationProviderCode,
  MoneyAmount,
  NormalizedFreightOffer,
  RouteEndpoint,
  FreightDimensions,
} from "@nakliyeborsasi/core";
import { IntegrationConfigurationService } from "./IntegrationConfigurationService";

@Injectable()
export class ExternalFreightOfferMapper {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
  ) {}

  public mapFromGenericRecord(
    providerCode: IntegrationProviderCode,
    record: Record<string, unknown>,
    marketScope: GeographicMarketCode,
  ): NormalizedFreightOffer {
    const externalReferenceId = String(
      record.externalReferenceId ?? record.id ?? record.reference,
    );
    const originCountry = String(record.originCountry ?? "TR");
    const originCity = String(record.originCity ?? "Istanbul");
    const destinationCountry = String(record.destinationCountry ?? "UA");
    const destinationCity = String(record.destinationCity ?? "Kyiv");
    const equipmentRaw = String(record.equipmentType ?? "TAUTLINER");
    const equipmentType = this.resolveEquipment(equipmentRaw);
    const weightTonnes = Number(record.weightTonnes ?? 20);
    const loadingDateStart = String(record.loadingDateStart ?? "2026-09-21");
    const loadingDateEnd =
      record.loadingDateEnd === undefined || record.loadingDateEnd === null
        ? null
        : String(record.loadingDateEnd);
    const priceAmount =
      record.priceAmount === undefined || record.priceAmount === null
        ? null
        : Number(record.priceAmount);
    const priceCurrency =
      record.priceCurrency === undefined || record.priceCurrency === null
        ? null
        : String(record.priceCurrency);
    const price =
      priceAmount !== null && priceCurrency !== null
        ? new MoneyAmount(priceAmount, priceCurrency)
        : null;
    return new NormalizedFreightOffer({
      externalReferenceId,
      providerCode,
      origin: new RouteEndpoint(originCountry, originCity),
      destination: new RouteEndpoint(destinationCountry, destinationCity),
      equipmentType,
      dimensions: new FreightDimensions(weightTonnes, null),
      loadingDateStart,
      loadingDateEnd,
      price,
      marketScope,
      rawPayloadDigest: this.integrationConfigurationService.buildPayloadDigest(
        record,
      ),
    });
  }

  public filterByCriteria(
    offers: readonly NormalizedFreightOffer[],
    criteria: ExternalFreightSearchCriteria,
  ): readonly NormalizedFreightOffer[] {
    return offers
      .filter((offer) => {
        if (
          criteria.originCountryCode &&
          offer.origin.countryCode !== criteria.originCountryCode
        ) {
          return false;
        }
        if (
          criteria.destinationCountryCode &&
          offer.destination.countryCode !== criteria.destinationCountryCode
        ) {
          return false;
        }
        if (
          criteria.equipmentType &&
          offer.equipmentType !== criteria.equipmentType
        ) {
          return false;
        }
        if (
          criteria.minimumWeightTonnes !== null &&
          offer.dimensions.weightTonnes < criteria.minimumWeightTonnes
        ) {
          return false;
        }
        if (criteria.marketScope && offer.marketScope !== criteria.marketScope) {
          return false;
        }
        return true;
      })
      .slice(0, criteria.limit);
  }

  private resolveEquipment(raw: string): EquipmentTypeCode {
    const normalized = raw.toUpperCase().replace(/-/g, "_");
    const mapping: Record<string, EquipmentTypeCode> = {
      TAUTLINER: EquipmentTypeCode.Tautliner,
      TENT: EquipmentTypeCode.Tautliner,
      REFRIGERATED: EquipmentTypeCode.Refrigerated,
      REEFER: EquipmentTypeCode.Refrigerated,
      FLATBED: EquipmentTypeCode.Flatbed,
      BOX: EquipmentTypeCode.Box,
      TANK: EquipmentTypeCode.Tank,
    };
    return mapping[normalized] ?? EquipmentTypeCode.Other;
  }
}
