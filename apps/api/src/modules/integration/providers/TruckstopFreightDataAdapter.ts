import { Injectable } from "@nestjs/common";
import {
  ExternalFreightDataPort,
  ExternalFreightSearchCriteria,
  GeographicMarketCode,
  IntegrationProviderCode,
  NormalizedFreightOffer,
} from "@nakliyeborsasi/core";
import { IntegrationConfigurationService } from "../IntegrationConfigurationService";
import { IntegrationHttpExecutor } from "../IntegrationHttpExecutor";
import { ExternalFreightOfferMapper } from "../ExternalFreightOfferMapper";

@Injectable()
export class TruckstopFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const baseUrl = this.integrationConfigurationService.getProviderBaseUrl(
      "TRUCKSTOP_API_BASE_URL",
    );
    const offers = baseUrl
      ? await this.fetchRemoteOffers(baseUrl)
      : this.buildFallbackOffers();
    return this.externalFreightOfferMapper.filterByCriteria(offers, criteria);
  }

  private async fetchRemoteOffers(
    baseUrl: string,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const payload = await this.integrationHttpExecutor.executeGetRequest<
      Record<string, unknown>[]
    >(IntegrationProviderCode.Truckstop, `${baseUrl}/loads`);
    return payload.map((record) =>
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Truckstop,
        record,
        GeographicMarketCode.Turkey,
      ),
    );
  }

  private buildFallbackOffers(): readonly NormalizedFreightOffer[] {
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Truckstop,
        {
          externalReferenceId: "truckstop-demo-001",
          originCountry: "TR",
          originCity: "Izmir",
          destinationCountry: "DE",
          destinationCity: "Berlin",
          equipmentType: "TAUTLINER",
          weightTonnes: 24,
          priceAmount: 2900,
          priceCurrency: "EUR",
        },
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    ];
  }
}
