import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuctionSessionStatusCode } from "@nakliyeborsasi/core";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CompanyTrustReviewInviteEntity } from "../../infrastructure/database/entities/CompanyTrustReviewInviteEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { TrustReviewNotificationService } from "./TrustReviewNotificationService";

const HOURS_MS = 60 * 60 * 1000;

@Injectable()
export class TrustReviewReminderService {
  private readonly logger = new Logger(TrustReviewReminderService.name);

  public constructor(
    @InjectRepository(AuctionSessionEntity)
    private readonly auctionSessionRepository: Repository<AuctionSessionEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    @InjectRepository(CompanyTrustReviewInviteEntity)
    private readonly inviteRepository: Repository<CompanyTrustReviewInviteEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly trustReviewNotificationService: TrustReviewNotificationService,
  ) {}

  public async runSweep(): Promise<void> {
    await this.remindPendingTransportConfirmations();
    await this.remindPendingTrustInvites();
  }

  private async remindPendingTransportConfirmations(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * HOURS_MS);
    const sessions = await this.auctionSessionRepository
      .createQueryBuilder("s")
      .where("s.statusCode = :closed", { closed: AuctionSessionStatusCode.Closed })
      .andWhere("s.winningBidId IS NOT NULL")
      .andWhere("s.transportCompletedAt IS NULL")
      .andWhere("s.transportConfirmReminderSentAt IS NULL")
      .andWhere("s.endsAt < :cutoff", { cutoff })
      .take(40)
      .getMany();

    for (const session of sessions) {
      const bid = await this.auctionBidRepository.findOne({
        where: { id: session.winningBidId! },
      });
      if (!bid) {
        continue;
      }
      const listing = await this.freightListingRepository.findOne({
        where: { id: session.freightListingId },
      });
      const routeLabel = listing
        ? `${listing.originCityName} → ${listing.destinationCityName}`
        : "İhale";
      try {
        await this.trustReviewNotificationService.notifyTransportConfirmNeeded(
          session,
          routeLabel,
          session.ownerCompanyId,
          bid.bidderCompanyId,
          "reminder24h",
        );
        session.transportConfirmReminderSentAt = new Date();
        await this.auctionSessionRepository.save(session);
      } catch (error) {
        this.logger.warn(
          `Transport confirm reminder failed ${session.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  private async remindPendingTrustInvites(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * HOURS_MS);
    const invites = await this.inviteRepository
      .createQueryBuilder("inv")
      .where("inv.fulfilledAt IS NULL")
      .andWhere("inv.dismissedAt IS NULL")
      .andWhere("inv.reminderSentAt IS NULL")
      .andWhere("inv.createdAt < :cutoff", { cutoff })
      .take(50)
      .getMany();

    for (const invite of invites) {
      const partner = await this.companyRepository.findOne({
        where: { id: invite.targetCompanyId },
      });
      try {
        await this.trustReviewNotificationService.notifyTrustReviewAvailable({
          companyId: invite.authorCompanyId,
          partnerLegalName: partner?.legalName ?? "Partner",
          targetCompanyId: invite.targetCompanyId,
          auctionSessionId: invite.sourceId,
          idempotencySuffix: "reminder24h",
        });
        invite.reminderSentAt = new Date();
        await this.inviteRepository.save(invite);
      } catch (error) {
        this.logger.warn(
          `Trust invite reminder failed ${invite.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
}
