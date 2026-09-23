import { PlatformFreightListing } from "@nakliyeborsasi/core";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";

export type AuctionSessionDetailResponse = {
  session: {
    id: string;
    freightListingId: string;
    ownerCompanyId: string;
    statusCode: string;
    endsAt: string;
    minimumBidAmount: string;
    currencyCode: string;
    winningBidId: string | null;
    createdAt: string;
    bids: {
      id: string;
      bidderCompanyId: string;
      bidAmount: string;
      createdAt: string;
    }[];
  };
  listing: {
    listingId: string;
    ownerCompanyId: string;
    origin: {
      countryCode: string;
      cityName: string;
      placeName: string | null;
      placeKindCode: string | null;
    };
    destination: {
      countryCode: string;
      cityName: string;
      placeName: string | null;
      placeKindCode: string | null;
    };
    equipmentType: string;
    weightTonnes: number;
    loadingDateStart: string;
    marketScope: string;
    price: { amount: number; currencyCode: string } | null;
  };
  ownerCompany: {
    companyId: string;
    legalName: string;
    countryCode: string;
    participantTypeCode: string | null;
    trustScore: number;
    trustReviewCount: number;
  };
};

function mapRouteEndpoint(endpoint: {
  countryCode: string;
  cityName: string;
  placeName: string | null;
  placeKindCode: string | null;
}) {
  return {
    countryCode: endpoint.countryCode,
    cityName: endpoint.cityName,
    placeName: endpoint.placeName,
    placeKindCode: endpoint.placeKindCode,
  };
}

export function mapListingToDetailApi(
  listing: PlatformFreightListing,
): AuctionSessionDetailResponse["listing"] {
  return {
    listingId: listing.listingId,
    ownerCompanyId: listing.ownerCompanyId,
    origin: mapRouteEndpoint(listing.origin),
    destination: mapRouteEndpoint(listing.destination),
    equipmentType: listing.equipmentType,
    weightTonnes: listing.weightTonnes,
    loadingDateStart: listing.loadingDateStart,
    marketScope: listing.marketScope,
    price:
      listing.price === null
        ? null
        : {
            amount: listing.price.amount,
            currencyCode: listing.price.currencyCode,
          },
  };
}

export function mapSessionDetail(
  session: AuctionSessionEntity,
  listing: PlatformFreightListing,
  owner: CompanyEntity,
  trustScore: number,
  trustReviewCount: number,
): AuctionSessionDetailResponse {
  const bids = (session.bids ?? []) as AuctionBidEntity[];
  return {
    session: {
      id: session.id,
      freightListingId: session.freightListingId,
      ownerCompanyId: session.ownerCompanyId,
      statusCode: session.statusCode,
      endsAt: session.endsAt.toISOString(),
      minimumBidAmount: session.minimumBidAmount,
      currencyCode: session.currencyCode,
      winningBidId: session.winningBidId,
      createdAt: session.createdAt.toISOString(),
      bids: bids
        .map((bid) => ({
          id: bid.id,
          bidderCompanyId: bid.bidderCompanyId,
          bidAmount: bid.bidAmount,
          createdAt: bid.createdAt.toISOString(),
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    },
    listing: mapListingToDetailApi(listing),
    ownerCompany: {
      companyId: owner.id,
      legalName: owner.legalName,
      countryCode: owner.countryCode,
      participantTypeCode: owner.participantTypeCode,
      trustScore,
      trustReviewCount,
    },
  };
}
