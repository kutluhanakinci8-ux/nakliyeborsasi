import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuctionSessionStatusCode,
  AuctionTypeCode,
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { MessagingThreadApplicationService } from "../messaging/MessagingThreadApplicationService";
import { OpenMessagingThreadRequestDto } from "../messaging/OpenMessagingThreadRequestDto";
import { FreightListingPriceOfferRequestDto } from "./FreightListingPriceOfferRequestDto";
import { AuctionSessionFinalizationService } from "./AuctionSessionFinalizationService";
import {
  buildDefaultAuctionTermsSummary,
  defaultPaymentDeferDays,
  defaultPaymentFormCode,
} from "./auctionDefaultTerms";

@Injectable()
export class AuctionListingPriceActionService {
  public constructor(
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly auctionSessionFinalizationService: AuctionSessionFinalizationService,
  ) {}

  public async acceptListingFixedPrice(
    authenticatedUser: AuthenticatedUserContext,
    freightListingId: string,
    locale: string,
  ): Promise<{ sessionId: string; bidId: string }> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Auction,
      locale,
    );
    const listing = await this.freightListingRepository.findOne({
      where: { id: freightListingId },
    });
    if (!listing) {
      throw new ResourceNotFoundException("FreightListing", freightListingId);
    }
    if (listing.ownerCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Cannot accept own listing price");
    }
    if (!listing.priceAmount) {
      throw new ValidationException("Listing has no fixed price");
    }
    const amount = listing.priceAmount;
    const currency = listing.priceCurrencyCode ?? "EUR";

    let session = await this.auctionSessionRepository.findOne({
      where: {
        freightListingId,
        statusCode: AuctionSessionStatusCode.Open,
      },
      relations: { bids: true },
    });

    if (!session) {
      session = await this.auctionSessionRepository.save(
        this.auctionSessionRepository.create({
          freightListingId,
          ownerCompanyId: listing.ownerCompanyId,
          statusCode: AuctionSessionStatusCode.Open,
          endsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          minimumBidAmount: amount,
          currencyCode: currency,
          winningBidId: null,
          auctionTypeCode: AuctionTypeCode.FixedAccept,
          autoExtendMinutes: 0,
          autoExtendWindowMinutes: 0,
          termsSummary: buildDefaultAuctionTermsSummary(listing),
          paymentFormCode: defaultPaymentFormCode(),
          paymentDeferDays: defaultPaymentDeferDays(),
          priceIncludesVat: false,
          bidStepAmount: null,
        }),
      );
    } else if (session.auctionTypeCode !== AuctionTypeCode.FixedAccept) {
      throw new ValidationException(
        "Open reverse auction exists; use bid flow or wait for close",
      );
    }

    const bid = await this.auctionBidRepository.save(
      this.auctionBidRepository.create({
        auctionSessionId: session.id,
        bidderCompanyId: authenticatedUser.companyId,
        bidAmount: amount,
      }),
    );

    await this.auctionSessionFinalizationService.finalizeSession(session.id);

    return { sessionId: session.id, bidId: bid.id };
  }

  public async sendMessengerPriceOffer(
    authenticatedUser: AuthenticatedUserContext,
    freightListingId: string,
    payload: FreightListingPriceOfferRequestDto,
    locale: string,
  ): Promise<{ threadId: string; messageId: string }> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    const listing = await this.freightListingRepository.findOne({
      where: { id: freightListingId },
    });
    if (!listing) {
      throw new ResourceNotFoundException("FreightListing", freightListingId);
    }
    if (listing.ownerCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Cannot negotiate with own listing");
    }

    const openPayload = new OpenMessagingThreadRequestDto();
    openPayload.counterpartyCompanyId = listing.ownerCompanyId;
    openPayload.freightListingId = freightListingId;
    const thread = await this.messagingThreadApplicationService.openThread(
      authenticatedUser,
      openPayload,
      locale,
    );

    const formattedAmount = payload.offerAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const note = payload.note?.trim();
    const bodyText = [
      `💰 Fiyat önerisi (TIMOCOM/Trans tarzı): ${formattedAmount} ${payload.currencyCode}`,
      note ? `Not: ${note}` : null,
      `İlan: ${listing.originCityName} → ${listing.destinationCityName}`,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await this.messagingThreadApplicationService.sendMessage(
      authenticatedUser,
      thread.id,
      bodyText,
      locale,
    );

    return { threadId: thread.id, messageId: message.id };
  }
}
