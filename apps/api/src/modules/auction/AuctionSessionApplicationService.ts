import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  AuctionSessionNotFoundException,
  AuctionSessionStatusCode,
  AuctionTypeCode,
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { CreateAuctionSessionRequestDto } from "./CreateAuctionSessionRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { AuctionSessionFinalizationService } from "./AuctionSessionFinalizationService";
import { PlatformFreightListingMapper } from "../marketplace/PlatformFreightListingMapper";
import { TrustScoreApplicationService } from "../trust/TrustScoreApplicationService";
import {
  AuctionSessionDetailResponse,
  AuctionSessionListItemResponse,
  AuctionSessionLiveSnapshotResponse,
  mapSessionDetail,
  mapSessionListItem,
} from "./AuctionSessionDetailMapper";
import {
  buildDefaultAuctionTermsSummary,
  defaultPaymentDeferDays,
  defaultPaymentFormCode,
} from "./auctionDefaultTerms";
import {
  findCompanyBid,
  rankReverseBids,
  validateBidForSession,
} from "./AuctionBidRules";
import { mapAuctionCompetition } from "./AuctionCompetitionMapper";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";

@Injectable()
export class AuctionSessionApplicationService {
  public constructor(
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly auctionSessionFinalizationService: AuctionSessionFinalizationService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly trustScoreApplicationService: TrustScoreApplicationService,
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
    const termsSummary =
      payload.termsSummary?.trim() ||
      buildDefaultAuctionTermsSummary(listing);
    const specDocumentUrl = payload.specDocumentUrl?.trim() || null;
    const specDocumentLabel =
      payload.specDocumentLabel?.trim() ||
      (specDocumentUrl ? "Taşıma şartnamesi" : null);
    const bidStep =
      payload.bidStepAmount !== undefined
        ? payload.bidStepAmount.toFixed(2)
        : null;

    return this.auctionSessionRepository.save(
      this.auctionSessionRepository.create({
        freightListingId: payload.freightListingId,
        ownerCompanyId: authenticatedUser.companyId,
        statusCode: AuctionSessionStatusCode.Open,
        endsAt,
        minimumBidAmount: payload.minimumBidAmount.toFixed(2),
        currencyCode: payload.currencyCode,
        winningBidId: null,
        termsSummary,
        specDocumentUrl,
        specDocumentLabel,
        paymentFormCode: payload.paymentFormCode ?? defaultPaymentFormCode(),
        paymentDeferDays: payload.paymentDeferDays ?? defaultPaymentDeferDays(),
        priceIncludesVat: payload.priceIncludesVat ?? false,
        bidStepAmount: bidStep,
        cargoDescription: payload.cargoDescription?.trim() || null,
        auctionTypeCode:
          payload.auctionTypeCode ?? AuctionTypeCode.ReverseOpen,
        autoExtendMinutes: payload.autoExtendMinutes ?? 5,
        autoExtendWindowMinutes: payload.autoExtendWindowMinutes ?? 3,
      }),
    );
  }

  public async listSessions(
    authenticatedUser: AuthenticatedUserContext,
    statusFilter: "open" | "closed" | "all",
  ): Promise<AuctionSessionListItemResponse[]> {
    await this.auctionSessionFinalizationService.closeAllExpiredOpenSessions();
    let sessions: AuctionSessionEntity[];
    if (statusFilter === "open") {
      sessions = await this.auctionSessionRepository.find({
        where: { statusCode: AuctionSessionStatusCode.Open },
        order: { createdAt: "DESC" },
        relations: { bids: true },
      });
    } else if (statusFilter === "closed") {
      sessions = await this.auctionSessionRepository.find({
        where: { statusCode: AuctionSessionStatusCode.Closed },
        order: { createdAt: "DESC" },
        relations: { bids: true },
      });
    } else {
      sessions = await this.auctionSessionRepository.find({
        order: { createdAt: "DESC" },
        relations: { bids: true },
      });
    }
    const listingIds = [
      ...new Set(sessions.map((session) => session.freightListingId)),
    ];
    const listingEntities = listingIds.length
      ? await this.freightListingRepository.find({
          where: { id: In(listingIds) },
        })
      : [];
    const listingById = new Map(
      listingEntities.map((entity) => [
        entity.id,
        PlatformFreightListingMapper.toDomain(entity),
      ]),
    );
    return sessions.map((session) =>
      mapSessionListItem(
        session,
        authenticatedUser.companyId,
        listingById.get(session.freightListingId) ?? null,
      ),
    );
  }

  public async getSessionById(
    auctionSessionId: string,
  ): Promise<AuctionSessionEntity> {
    await this.auctionSessionFinalizationService.closeAllExpiredOpenSessions();
    const session = await this.auctionSessionRepository.findOne({
      where: { id: auctionSessionId },
      relations: { bids: true },
    });
    if (!session) {
      throw new AuctionSessionNotFoundException(auctionSessionId);
    }
    return session;
  }

  public async getSessionDetail(
    authenticatedUser: AuthenticatedUserContext,
    auctionSessionId: string,
    locale: string,
  ): Promise<AuctionSessionDetailResponse> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Auction,
      locale,
    );
    const session = await this.getSessionById(auctionSessionId);
    const listingEntity = await this.freightListingRepository.findOne({
      where: { id: session.freightListingId },
    });
    if (!listingEntity) {
      throw new ResourceNotFoundException(
        "FreightListing",
        session.freightListingId,
      );
    }
    const owner = await this.companyRepository.findOne({
      where: { id: session.ownerCompanyId },
    });
    if (!owner) {
      throw new ResourceNotFoundException("Company", session.ownerCompanyId);
    }
    const trust = await this.trustScoreApplicationService.getCompanyTrustSnapshot(
      session.ownerCompanyId,
    );
    const listing = PlatformFreightListingMapper.toDomain(listingEntity);
    return mapSessionDetail(
      session,
      listing,
      owner,
      trust.scoreValue,
      trust.reviewCount,
      authenticatedUser.companyId,
    );
  }

  public async getSessionLiveSnapshot(
    authenticatedUser: AuthenticatedUserContext,
    auctionSessionId: string,
    locale: string,
  ): Promise<AuctionSessionLiveSnapshotResponse> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Auction,
      locale,
    );
    const session = await this.getSessionById(auctionSessionId);
    const bids = (session.bids ?? []) as AuctionBidEntity[];
    const isOwner = session.ownerCompanyId === authenticatedUser.companyId;
    return {
      sessionId: session.id,
      statusCode: session.statusCode,
      endsAt: session.endsAt.toISOString(),
      competition: mapAuctionCompetition(
        session,
        bids,
        authenticatedUser.companyId,
        isOwner,
      ),
    };
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
      relations: { bids: true },
    });
    if (!session) {
      throw new AuctionSessionNotFoundException(auctionSessionId);
    }
    if (session.statusCode !== AuctionSessionStatusCode.Open) {
      throw new ValidationException("Auction session is closed");
    }
    if (session.endsAt.getTime() < Date.now()) {
      await this.auctionSessionFinalizationService.closeAllExpiredOpenSessions();
      throw new ValidationException("Auction session has expired");
    }
    if (session.ownerCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Listing owner cannot bid on own auction");
    }
    const bids = (session.bids ?? []) as AuctionBidEntity[];
    const validation = validateBidForSession(
      session,
      bids,
      authenticatedUser.companyId,
      bidAmount,
    );
    if (!validation.ok) {
      throw new ValidationException(
        `Bid rejected: ${validation.reasonCode}`,
      );
    }

    const rankedBefore = rankReverseBids(bids);
    const previousLeaderCompanyId =
      rankedBefore[0]?.bid.bidderCompanyId ?? null;

    const existing = findCompanyBid(bids, authenticatedUser.companyId);
    let saved: AuctionBidEntity;
    if (existing) {
      existing.bidAmount = bidAmount.toFixed(2);
      saved = await this.auctionBidRepository.save(existing);
    } else {
      saved = await this.auctionBidRepository.save(
        this.auctionBidRepository.create({
          auctionSessionId,
          bidderCompanyId: authenticatedUser.companyId,
          bidAmount: bidAmount.toFixed(2),
        }),
      );
    }

    const msUntilEnd = session.endsAt.getTime() - Date.now();
    const windowMs = session.autoExtendWindowMinutes * 60 * 1000;
    if (
      session.autoExtendMinutes > 0 &&
      windowMs > 0 &&
      msUntilEnd > 0 &&
      msUntilEnd <= windowMs
    ) {
      session.endsAt = new Date(
        session.endsAt.getTime() + session.autoExtendMinutes * 60 * 1000,
      );
      await this.auctionSessionRepository.save(session);
    }

    void this.operationalNotificationService
      .afterAuctionBidPlaced({
        session,
        bid: saved,
        bidderCompanyId: authenticatedUser.companyId,
        previousLeaderCompanyId,
      })
      .catch(() => undefined);

    return saved;
  }
}
