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
export class DellaFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const baseUrl = this.integrationConfigurationService.getProviderBaseUrl(
      "DELLA_API_BASE_URL",
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
    >(IntegrationProviderCode.Della, `${baseUrl}/api/v1/loads`);
    return payload.map((record) =>
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Della,
        record,
        GeographicMarketCode.Ukraine,
      ),
    );
  }

  private buildFallbackOffers(): readonly NormalizedFreightOffer[] {
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Della,
        {
          externalReferenceId: "della-demo-001",
          originCountry: "UA",
          originCity: "Kyiv",
          destinationCountry: "PL",
          destinationCity: "Warsaw",
          equipmentType: "REFRIGERATED",
          weightTonnes: 20,
          priceAmount: 24000,
          priceCurrency: "UAH",
        },
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    ];
  }
}
