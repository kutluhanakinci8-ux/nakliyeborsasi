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
export class SennderFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const baseUrl = this.integrationConfigurationService.getProviderBaseUrl(
      "SENNDER_API_BASE_URL",
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
    >(IntegrationProviderCode.Sennder, `${baseUrl}/marketplace/orders`);
    return payload.map((record) =>
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Sennder,
        record,
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    );
  }

  private buildFallbackOffers(): readonly NormalizedFreightOffer[] {
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Sennder,
        {
          externalReferenceId: "sennder-demo-001",
          originCountry: "DE",
          originCity: "Hamburg",
          destinationCountry: "PL",
          destinationCity: "Poznan",
          equipmentType: "BOX",
          weightTonnes: 12,
          priceAmount: 980,
          priceCurrency: "EUR",
        },
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    ];
  }
}
