import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";

export type MessagingListingCard = {
  listingId: string;
  routeLabel: string;
  equipmentTypeCode: string;
  weightTonnes: string;
  loadingDateStart: string;
  priceAmount: string | null;
  priceCurrencyCode: string | null;
  marketScopeCode: string;
};

export function buildMessagingListingCard(
  listing: FreightListingEntity | null,
): MessagingListingCard | null {
  if (!listing) {
    return null;
  }
  return {
    listingId: listing.id,
    routeLabel: `${listing.originCityName} (${listing.originCountryCode}) → ${listing.destinationCityName} (${listing.destinationCountryCode})`,
    equipmentTypeCode: listing.equipmentTypeCode,
    weightTonnes: listing.weightTonnes,
    loadingDateStart: listing.loadingDateStart,
    priceAmount: listing.priceAmount,
    priceCurrencyCode: listing.priceCurrencyCode,
    marketScopeCode: listing.marketScopeCode,
  };
}
