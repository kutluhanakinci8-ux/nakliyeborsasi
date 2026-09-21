import { NormalizedFreightOffer } from "@nakliyeborsasi/core";
import { IntegrationProviderFailureRecord } from "./IntegrationProviderFailureRecord";

export class AggregatedExternalFreightSearchResult {
  public readonly offers: readonly NormalizedFreightOffer[];

  public readonly failures: readonly IntegrationProviderFailureRecord[];

  public constructor(
    offers: readonly NormalizedFreightOffer[],
    failures: readonly IntegrationProviderFailureRecord[],
  ) {
    this.offers = offers;
    this.failures = failures;
  }
}
