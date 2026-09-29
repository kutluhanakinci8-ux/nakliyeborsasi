import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuctionSessionNotFoundException,
  AuctionSessionStatusCode,
} from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { TrustReviewNotificationService } from "../trust/TrustReviewNotificationService";

@Injectable()
export class AuctionSessionFinalizationService {
  public constructor(
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    private readonly trustReviewNotificationService: TrustReviewNotificationService,
  ) {}

  public async closeAllExpiredOpenSessions(): Promise<number> {
    const expiredSessions = await this.auctionSessionRepository
      .createQueryBuilder("session")
      .where("session.statusCode = :openStatus", {
        openStatus: AuctionSessionStatusCode.Open,
      })
      .andWhere("session.endsAt < :now", { now: new Date() })
      .getMany();
    for (const session of expiredSessions) {
      await this.finalizeSession(session.id);
    }
    return expiredSessions.length;
  }

  public async finalizeSession(auctionSessionId: string): Promise<AuctionSessionEntity> {
    const session = await this.auctionSessionRepository.findOne({
      where: { id: auctionSessionId },
    });
    if (!session) {
      throw new AuctionSessionNotFoundException(auctionSessionId);
    }
    if (session.statusCode !== AuctionSessionStatusCode.Open) {
      return session;
    }
    const winningBid = await this.auctionBidRepository
      .createQueryBuilder("bid")
      .where("bid.auctionSessionId = :auctionSessionId", { auctionSessionId })
      .orderBy("bid.bidAmount", "ASC")
      .addOrderBy("bid.createdAt", "ASC")
      .getOne();
    session.statusCode = AuctionSessionStatusCode.Closed;
    session.winningBidId = winningBid?.id ?? null;
    const saved = await this.auctionSessionRepository.save(session);
    if (saved.winningBidId && winningBid) {
      const listing = await this.freightListingRepository.findOne({
        where: { id: saved.freightListingId },
      });
      const routeLabel = listing
        ? `${listing.originCityName} → ${listing.destinationCityName}`
        : "İhale";
      void this.trustReviewNotificationService
        .notifyTransportConfirmNeeded(
          saved,
          routeLabel,
          saved.ownerCompanyId,
          winningBid.bidderCompanyId,
          "initial",
        )
        .catch(() => undefined);
    }
    return saved;
  }
}
