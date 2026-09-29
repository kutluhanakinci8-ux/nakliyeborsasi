import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuctionSessionNotFoundException,
  AuctionSessionStatusCode,
  AuthenticatedUserContext,
  ValidationException,
} from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { ConfirmTransportCompletionRequestDto } from "./ConfirmTransportCompletionRequestDto";
import { TrustReviewInviteService } from "../trust/TrustReviewInviteService";
import { TrustReviewNotificationService } from "../trust/TrustReviewNotificationService";

@Injectable()
export class AuctionTransportCompletionService {
  public constructor(
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly trustReviewInviteService: TrustReviewInviteService,
    private readonly trustReviewNotificationService: TrustReviewNotificationService,
  ) {}

  public async confirmTransport(
    authenticatedUser: AuthenticatedUserContext,
    auctionSessionId: string,
    body: ConfirmTransportCompletionRequestDto,
  ): Promise<{ session: AuctionSessionEntity }> {
    const session = await this.auctionSessionRepository.findOne({
      where: { id: auctionSessionId },
    });
    if (!session) {
      throw new AuctionSessionNotFoundException(auctionSessionId);
    }
    if (session.statusCode !== AuctionSessionStatusCode.Closed) {
      throw new ValidationException("Auction must be closed");
    }
    if (!session.winningBidId) {
      throw new ValidationException("No winning bid");
    }
    if (session.transportCompletedAt) {
      return { session };
    }

    const winningBid = await this.auctionBidRepository.findOne({
      where: { id: session.winningBidId },
    });
    if (!winningBid) {
      throw new ValidationException("Winning bid missing");
    }

    const participantIds = new Set([
      session.ownerCompanyId,
      winningBid.bidderCompanyId,
    ]);
    if (!participantIds.has(authenticatedUser.companyId)) {
      throw new ValidationException("Only auction participants can confirm transport");
    }

    session.transportCompletedAt = new Date();
    session.transportCompletedByCompanyId = authenticatedUser.companyId;
    session.transportCompletionNote = body.completionNote?.trim() || null;
    const saved = await this.auctionSessionRepository.save(session);

    await this.trustReviewInviteService.issueForClosedAuction(saved);

    const owner = await this.companyRepository.findOne({
      where: { id: session.ownerCompanyId },
    });
    const winner = await this.companyRepository.findOne({
      where: { id: winningBid.bidderCompanyId },
    });

    await this.trustReviewNotificationService.notifyTrustReviewAvailable({
      companyId: session.ownerCompanyId,
      partnerLegalName: winner?.legalName ?? "Partner",
      targetCompanyId: winningBid.bidderCompanyId,
      auctionSessionId: session.id,
    });
    await this.trustReviewNotificationService.notifyTrustReviewAvailable({
      companyId: winningBid.bidderCompanyId,
      partnerLegalName: owner?.legalName ?? "Partner",
      targetCompanyId: session.ownerCompanyId,
      auctionSessionId: session.id,
    });

    return { session: saved };
  }
}
