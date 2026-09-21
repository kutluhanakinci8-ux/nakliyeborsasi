import { Injectable } from "@nestjs/common";
import {
  ExternalFreightSearchCriteria,
  IntegrationProviderCode,
  IntegrationProviderException,
} from "@nakliyeborsasi/core";
import { LardiTransFreightDataAdapter } from "./providers/LardiTransFreightDataAdapter";
import { DellaFreightDataAdapter } from "./providers/DellaFreightDataAdapter";
import { DatFreightDataAdapter } from "./providers/DatFreightDataAdapter";
import { TruckstopFreightDataAdapter } from "./providers/TruckstopFreightDataAdapter";
import { SennderFreightDataAdapter } from "./providers/SennderFreightDataAdapter";
import { FreightosFreightDataAdapter } from "./providers/FreightosFreightDataAdapter";
import { AggregatedExternalFreightSearchResult } from "./AggregatedExternalFreightSearchResult";
import { IntegrationProviderFailureRecord } from "./IntegrationProviderFailureRecord";

@Injectable()
export class ExternalFreightDataOrchestrator {
  public constructor(
    private readonly lardiTransFreightDataAdapter: LardiTransFreightDataAdapter,
    private readonly dellaFreightDataAdapter: DellaFreightDataAdapter,
    private readonly datFreightDataAdapter: DatFreightDataAdapter,
    private readonly truckstopFreightDataAdapter: TruckstopFreightDataAdapter,
    private readonly sennderFreightDataAdapter: SennderFreightDataAdapter,
    private readonly freightosFreightDataAdapter: FreightosFreightDataAdapter,
  ) {}

  public async searchAllProviders(
    criteria: ExternalFreightSearchCriteria,
    providerFilter: readonly IntegrationProviderCode[] | null,
  ): Promise<AggregatedExternalFreightSearchResult> {
    const tasks = this.resolveActiveAdapters(providerFilter).map(
      async (entry) => {
        try {
          const offers = await entry.adapter.fetchOffers(criteria);
          return { offers, failure: null as IntegrationProviderFailureRecord | null };
        } catch (error) {
          const message =
            error instanceof IntegrationProviderException
              ? error.message
              : error instanceof Error
                ? error.message
                : "Unknown provider failure";
          return {
            offers: [],
            failure: new IntegrationProviderFailureRecord(
              entry.providerCode,
              message,
            ),
          };
        }
      },
    );
    const results = await Promise.all(tasks);
    const offers = results.flatMap((result) => result.offers);
    const failures = results
      .map((result) => result.failure)
      .filter(
        (failure): failure is IntegrationProviderFailureRecord =>
          failure !== null,
      );
    return new AggregatedExternalFreightSearchResult(offers, failures);
  }

  private resolveActiveAdapters(
    providerFilter: readonly IntegrationProviderCode[] | null,
  ): Array<{
    providerCode: IntegrationProviderCode;
    adapter: {
      fetchOffers: (
        criteria: ExternalFreightSearchCriteria,
      ) => Promise<readonly import("@nakliyeborsasi/core").NormalizedFreightOffer[]>;
    };
  }> {
    const registry = [
      {
        providerCode: IntegrationProviderCode.LardiTrans,
        adapter: this.lardiTransFreightDataAdapter,
      },
      {
        providerCode: IntegrationProviderCode.Della,
        adapter: this.dellaFreightDataAdapter,
      },
      {
        providerCode: IntegrationProviderCode.Dat,
        adapter: this.datFreightDataAdapter,
      },
      {
        providerCode: IntegrationProviderCode.Truckstop,
        adapter: this.truckstopFreightDataAdapter,
      },
      {
        providerCode: IntegrationProviderCode.Sennder,
        adapter: this.sennderFreightDataAdapter,
      },
      {
        providerCode: IntegrationProviderCode.Freightos,
        adapter: this.freightosFreightDataAdapter,
      },
    ];
    if (!providerFilter || providerFilter.length === 0) {
      return registry;
    }
    return registry.filter((entry) =>
      providerFilter.includes(entry.providerCode),
    );
  }
}
