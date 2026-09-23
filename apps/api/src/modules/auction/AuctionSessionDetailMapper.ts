import { PlatformFreightListing } from "@nakliyeborsasi/core";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import {
  AuctionCompetitionSnapshot,
  mapAuctionCompetition,
} from "./AuctionCompetitionMapper";

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
    termsSummary: string | null;
    specDocumentUrl: string | null;
    specDocumentLabel: string | null;
    paymentFormCode: string | null;
    paymentDeferDays: number | null;
    priceIncludesVat: boolean;
    bidStepAmount: string | null;
    cargoDescription: string | null;
    auctionTypeCode: string;
    autoExtendMinutes: number;
    autoExtendWindowMinutes: number;
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
  competition: AuctionCompetitionSnapshot;
};

export type AuctionSessionListItemResponse = {
  id: string;
  freightListingId: string;
  minimumBidAmount: string;
  currencyCode: string;
  endsAt: string;
  statusCode: string;
  winningBidId: string | null;
  auctionTypeCode: string;
  bids?: {
    id: string;
    bidderCompanyId: string;
    bidAmount: string;
    createdAt?: string;
  }[];
  competition: AuctionCompetitionSnapshot;
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

export function mapSessionListItem(
  session: AuctionSessionEntity,
  viewerCompanyId: string,
): AuctionSessionListItemResponse {
  const bids = (session.bids ?? []) as AuctionBidEntity[];
  const isOwner = session.ownerCompanyId === viewerCompanyId;
  return {
    id: session.id,
    freightListingId: session.freightListingId,
    minimumBidAmount: session.minimumBidAmount,
    currencyCode: session.currencyCode,
    endsAt: session.endsAt.toISOString(),
    statusCode: session.statusCode,
    winningBidId: session.winningBidId,
    auctionTypeCode: session.auctionTypeCode,
    bids: bids.map((bid) => ({
      id: bid.id,
      bidderCompanyId: bid.bidderCompanyId,
      bidAmount: bid.bidAmount,
      createdAt: bid.createdAt.toISOString(),
    })),
    competition: mapAuctionCompetition(
      session,
      bids,
      viewerCompanyId,
      isOwner,
    ),
  };
}

export function mapSessionDetail(
  session: AuctionSessionEntity,
  listing: PlatformFreightListing,
  owner: CompanyEntity,
  trustScore: number,
  trustReviewCount: number,
  viewerCompanyId: string,
): AuctionSessionDetailResponse {
  const bids = (session.bids ?? []) as AuctionBidEntity[];
  const isOwner = session.ownerCompanyId === viewerCompanyId;
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
      termsSummary: session.termsSummary,
      specDocumentUrl: session.specDocumentUrl,
      specDocumentLabel: session.specDocumentLabel,
      paymentFormCode: session.paymentFormCode,
      paymentDeferDays: session.paymentDeferDays,
      priceIncludesVat: session.priceIncludesVat,
      bidStepAmount: session.bidStepAmount,
      cargoDescription: session.cargoDescription,
      auctionTypeCode: session.auctionTypeCode,
      autoExtendMinutes: session.autoExtendMinutes,
      autoExtendWindowMinutes: session.autoExtendWindowMinutes,
      bids: bids
        .map((bid) => ({
          id: bid.id,
          bidderCompanyId: bid.bidderCompanyId,
          bidAmount: bid.bidAmount,
          createdAt: bid.createdAt.toISOString(),
        }))
        .sort(
          (a, b) =>
            Number(a.bidAmount) - Number(b.bidAmount) ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
    competition: mapAuctionCompetition(
      session,
      bids,
      viewerCompanyId,
      isOwner,
    ),
  };
}

export type AuctionSessionLiveSnapshotResponse = {
  sessionId: string;
  statusCode: string;
  endsAt: string;
  competition: AuctionCompetitionSnapshot;
};
