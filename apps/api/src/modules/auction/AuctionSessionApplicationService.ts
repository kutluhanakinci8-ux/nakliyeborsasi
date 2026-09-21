import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuctionSessionNotFoundException,
  AuctionSessionStatusCode,
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CreateAuctionSessionRequestDto } from "./CreateAuctionSessionRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";

@Injectable()
export class AuctionSessionApplicationService {
  public constructor(
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  public async createSession(
    authenticatedUser: AuthenticatedUserContext,
    payload: CreateAuctionSessionRequestDto,
    locale: string,
  ): Promise<AuctionSessionEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Auction,
      locale,
    );
    const listing = await this.freightListingRepository.findOne({
      where: { id: payload.freightListingId },
    });
    if (!listing) {
      throw new ResourceNotFoundException(
        "FreightListing",
        payload.freightListingId,
      );
    }
    if (listing.ownerCompanyId !== authenticatedUser.companyId) {
      throw new ValidationException("Only listing owner can open auction");
    }
    const endsAt = new Date(
      Date.now() + payload.durationHours * 60 * 60 * 1000,
    );
    return this.auctionSessionRepository.save(
      this.auctionSessionRepository.create({
        freightListingId: payload.freightListingId,
        ownerCompanyId: authenticatedUser.companyId,
        statusCode: AuctionSessionStatusCode.Open,
        endsAt,
        minimumBidAmount: payload.minimumBidAmount.toFixed(2),
        currencyCode: payload.currencyCode,
      }),
    );
  }

  public async listOpenSessions(): Promise<AuctionSessionEntity[]> {
    return this.auctionSessionRepository.find({
      where: { statusCode: AuctionSessionStatusCode.Open },
      order: { createdAt: "DESC" },
      relations: { bids: true },
    });
  }

  public async placeBid(
    authenticatedUser: AuthenticatedUserContext,
    auctionSessionId: string,
    bidAmount: number,
    locale: string,
  ): Promise<AuctionBidEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Auction,
      locale,
    );
    const session = await this.auctionSessionRepository.findOne({
      where: { id: auctionSessionId },
    });
    if (!session) {
      throw new AuctionSessionNotFoundException(auctionSessionId);
    }
    if (session.statusCode !== AuctionSessionStatusCode.Open) {
      throw new ValidationException("Auction session is closed");
    }
    if (session.endsAt.getTime() < Date.now()) {
      session.statusCode = AuctionSessionStatusCode.Closed;
      await this.auctionSessionRepository.save(session);
      throw new ValidationException("Auction session has expired");
    }
    if (session.ownerCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Listing owner cannot bid on own auction");
    }
    const minimum = Number(session.minimumBidAmount);
    if (bidAmount < minimum) {
      throw new ValidationException(
        this.localeResolutionService.translate(
          locale,
          "errors.validation_failed",
        ),
      );
    }
    return this.auctionBidRepository.save(
      this.auctionBidRepository.create({
        auctionSessionId,
        bidderCompanyId: authenticatedUser.companyId,
        bidAmount: bidAmount.toFixed(2),
      }),
    );
  }
}
