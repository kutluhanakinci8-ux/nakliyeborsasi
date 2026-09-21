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
export class LardiTransFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const baseUrl = this.integrationConfigurationService.getProviderBaseUrl(
      "LARDI_TRANS_API_BASE_URL",
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
    >(IntegrationProviderCode.LardiTrans, `${baseUrl}/public/offers`);
    return payload.map((record) =>
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.LardiTrans,
        record,
        GeographicMarketCode.Ukraine,
      ),
    );
  }

  private buildFallbackOffers(): readonly NormalizedFreightOffer[] {
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.LardiTrans,
        {
          externalReferenceId: "lardi-demo-001",
          originCountry: "TR",
          originCity: "Istanbul",
          destinationCountry: "UA",
          destinationCity: "Lviv",
          equipmentType: "TAUTLINER",
          weightTonnes: 22,
          priceAmount: 1850,
          priceCurrency: "EUR",
        },
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    ];
  }
}
