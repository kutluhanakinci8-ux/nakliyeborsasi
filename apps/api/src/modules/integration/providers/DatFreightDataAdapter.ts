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
export class DatFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const baseUrl = this.integrationConfigurationService.getProviderBaseUrl(
      "DAT_API_BASE_URL",
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
    >(IntegrationProviderCode.Dat, `${baseUrl}/loads/search`);
    return payload.map((record) =>
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Dat,
        record,
        GeographicMarketCode.Turkey,
      ),
    );
  }

  private buildFallbackOffers(): readonly NormalizedFreightOffer[] {
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Dat,
        {
          externalReferenceId: "dat-demo-001",
          originCountry: "US",
          originCity: "Chicago",
          destinationCountry: "US",
          destinationCity: "Dallas",
          equipmentType: "FLATBED",
          weightTonnes: 18,
          priceAmount: 3200,
          priceCurrency: "USD",
        },
        GeographicMarketCode.Turkey,
      ),
    ];
  }
}
