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
export class FreightosFreightDataAdapter implements ExternalFreightDataPort {
  public constructor(
    private readonly integrationConfigurationService: IntegrationConfigurationService,
    private readonly integrationHttpExecutor: IntegrationHttpExecutor,
    private readonly externalFreightOfferMapper: ExternalFreightOfferMapper,
  ) {}

  public async fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const calculatorUrl =
      this.integrationConfigurationService.getProviderBaseUrl(
        "FREIGHTOS_SHIPPING_CALCULATOR_URL",
      ) ??
      "https://ship.freightos.com/api/shippingCalculator";
    const offers = await this.fetchCalculatorEstimate(calculatorUrl);
    return this.externalFreightOfferMapper.filterByCriteria(offers, criteria);
  }

  private async fetchCalculatorEstimate(
    calculatorUrl: string,
  ): Promise<readonly NormalizedFreightOffer[]> {
    const query =
      `${calculatorUrl}?loadtype=boxes&weight=200&width=50&length=50&height=50` +
      "&quantity=2&origin=IST&destination=KBP&mode=FTL&format=json&estimate=true";
    const payload = await this.integrationHttpExecutor.executeGetRequest<
      Record<string, unknown>
    >(IntegrationProviderCode.Freightos, query);
    const minPrice = Number(payload.minPrice ?? payload.min ?? 0);
    return [
      this.externalFreightOfferMapper.mapFromGenericRecord(
        IntegrationProviderCode.Freightos,
        {
          externalReferenceId: "freightos-estimate-001",
          originCountry: "TR",
          originCity: "Istanbul",
          destinationCountry: "UA",
          destinationCity: "Kyiv",
          equipmentType: "BOX",
          weightTonnes: 20,
          priceAmount: minPrice > 0 ? minPrice : 1500,
          priceCurrency: "USD",
        },
        GeographicMarketCode.EuropeanUnionCorridor,
      ),
    ];
  }
}
