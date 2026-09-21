import { ExternalFreightSearchCriteria } from "../types/FreightSearchTypes";
import { NormalizedFreightOffer } from "../types/NormalizedFreightOffer";

export interface ExternalFreightDataPort {
  fetchOffers(
    criteria: ExternalFreightSearchCriteria,
  ): Promise<readonly NormalizedFreightOffer[]>;
}
