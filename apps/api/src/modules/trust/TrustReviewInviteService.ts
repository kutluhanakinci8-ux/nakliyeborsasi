import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TrustReviewInviteSourceCode } from "@nakliyeborsasi/core";
import { CompanyTrustReviewInviteEntity } from "../../infrastructure/database/entities/CompanyTrustReviewInviteEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";

export type TrustReviewInviteView = {
  id: string;
  targetCompanyId: string;
  targetLegalName: string;
  sourceCode: string;
  sourceId: string;
  contextLabel: string | null;
  createdAt: string;
  trustUrl: string;
};

@Injectable()
export class TrustReviewInviteService {
  public constructor(
    @InjectRepository(CompanyTrustReviewInviteEntity)
    private readonly inviteRepository: Repository<CompanyTrustReviewInviteEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(AuctionBidEntity)
    private readonly auctionBidRepository: Repository<AuctionBidEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
  ) {}

  public async issueForClosedAuction(
    session: AuctionSessionEntity,
  ): Promise<void> {
    if (!session.winningBidId) {
      return;
    }
    const winningBid = await this.auctionBidRepository.findOne({
      where: { id: session.winningBidId },
    });
    if (!winningBid) {
      return;
    }
    const winnerCompanyId = winningBid.bidderCompanyId;
    const ownerCompanyId = session.ownerCompanyId;
    if (winnerCompanyId === ownerCompanyId) {
      return;
    }

    const listing = await this.freightListingRepository.findOne({
      where: { id: session.freightListingId },
    });
    const contextLabel = listing
      ? `Taşıma onayı · ${listing.originCityName} → ${listing.destinationCityName}`
      : "Taşıma onayı · tamamlanan ihale";

    await this.upsertInvite({
      authorCompanyId: ownerCompanyId,
      targetCompanyId: winnerCompanyId,
      sourceCode: TrustReviewInviteSourceCode.AuctionClosed,
      sourceId: session.id,
      contextLabel,
    });
    await this.upsertInvite({
      authorCompanyId: winnerCompanyId,
      targetCompanyId: ownerCompanyId,
      sourceCode: TrustReviewInviteSourceCode.AuctionClosed,
      sourceId: session.id,
      contextLabel,
    });
  }

  public async listPendingForCompany(
    authorCompanyId: string,
  ): Promise<TrustReviewInviteView[]> {
    const pending = await this.inviteRepository
      .createQueryBuilder("inv")
      .where("inv.authorCompanyId = :authorCompanyId", { authorCompanyId })
      .andWhere("inv.fulfilledAt IS NULL")
      .andWhere("inv.dismissedAt IS NULL")
      .orderBy("inv.createdAt", "DESC")
      .take(25)
      .getMany();

    const targetIds = [...new Set(pending.map((row) => row.targetCompanyId))];
    const companies = targetIds.length
      ? await this.companyRepository.find({ where: { id: In(targetIds) } })
      : [];
    const nameById = new Map(companies.map((c) => [c.id, c.legalName]));

    return pending.map((row) => ({
      id: row.id,
      targetCompanyId: row.targetCompanyId,
      targetLegalName:
        nameById.get(row.targetCompanyId) ??
        `${row.targetCompanyId.slice(0, 8)}…`,
      sourceCode: row.sourceCode,
      sourceId: row.sourceId,
      contextLabel: row.contextLabel,
      createdAt: row.createdAt.toISOString(),
      trustUrl: `/trust?companyId=${encodeURIComponent(row.targetCompanyId)}&inviteId=${encodeURIComponent(row.id)}`,
    }));
  }

  public async dismissInvite(
    inviteId: string,
    authorCompanyId: string,
  ): Promise<void> {
    const row = await this.inviteRepository.findOne({ where: { id: inviteId } });
    if (!row || row.authorCompanyId !== authorCompanyId) {
      return;
    }
    row.dismissedAt = new Date();
    await this.inviteRepository.save(row);
  }

  public async markFulfilledForReview(
    authorCompanyId: string,
    targetCompanyId: string,
  ): Promise<void> {
    await this.inviteRepository
      .createQueryBuilder()
      .update(CompanyTrustReviewInviteEntity)
      .set({ fulfilledAt: new Date() })
      .where("authorCompanyId = :authorCompanyId", { authorCompanyId })
      .andWhere("targetCompanyId = :targetCompanyId", { targetCompanyId })
      .andWhere("fulfilledAt IS NULL")
      .execute();
  }

  private async upsertInvite(params: {
    authorCompanyId: string;
    targetCompanyId: string;
    sourceCode: TrustReviewInviteSourceCode;
    sourceId: string;
    contextLabel: string;
  }): Promise<void> {
    const existing = await this.inviteRepository.findOne({
      where: {
        authorCompanyId: params.authorCompanyId,
        targetCompanyId: params.targetCompanyId,
        sourceCode: params.sourceCode,
        sourceId: params.sourceId,
      },
    });
    if (existing) {
      return;
    }
    await this.inviteRepository.save(
      this.inviteRepository.create({
        authorCompanyId: params.authorCompanyId,
        targetCompanyId: params.targetCompanyId,
        sourceCode: params.sourceCode,
        sourceId: params.sourceId,
        contextLabel: params.contextLabel,
        fulfilledAt: null,
        dismissedAt: null,
      }),
    );
  }
}
