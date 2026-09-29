import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  TrustCompanyPublicProfile,
  TrustScoreSnapshot,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { SubmitCompanyTrustReviewRequestDto } from "./SubmitCompanyTrustReviewRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";

@Injectable()
export class TrustScoreApplicationService {
  public constructor(
    @InjectRepository(CompanyTrustReviewEntity)
    private readonly companyTrustReviewRepository: Repository<CompanyTrustReviewEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
  ) {}

  public async getCompanyTrustSnapshot(
    companyId: string,
  ): Promise<TrustScoreSnapshot> {
    const profile = await this.getCompanyPublicProfile(companyId);
    return new TrustScoreSnapshot({
      companyId: profile.companyId,
      scoreValue: profile.scoreValue,
      reviewCount: profile.reviewCount,
    });
  }

  public async getCompanyPublicProfile(
    companyId: string,
  ): Promise<TrustCompanyPublicProfile> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new ResourceNotFoundException("Company", companyId);
    }

    const aggregate = await this.companyTrustReviewRepository
      .createQueryBuilder("review")
      .select("AVG(review.scoreValue)", "averageScore")
      .addSelect("COUNT(review.id)", "reviewCount")
      .where("review.targetCompanyId = :companyId", { companyId })
      .getRawOne<{ averageScore: string | null; reviewCount: string }>();

    const reviewCount = Number(aggregate?.reviewCount ?? 0);
    const averageScore = Number(aggregate?.averageScore ?? 0);
    const scoreValue =
      reviewCount === 0 ? 0 : Math.round(averageScore * 10) / 10;

    const distributionRows = await this.companyTrustReviewRepository
      .createQueryBuilder("review")
      .select("review.scoreValue", "scoreValue")
      .addSelect("COUNT(review.id)", "count")
      .where("review.targetCompanyId = :companyId", { companyId })
      .groupBy("review.scoreValue")
      .getRawMany<{ scoreValue: string; count: string }>();

    const distribution = [1, 2, 3, 4, 5].map((score) => {
      const row = distributionRows.find(
        (item) => Number(item.scoreValue) === score,
      );
      return { scoreValue: score, count: Number(row?.count ?? 0) };
    });

    const recentEntities = await this.companyTrustReviewRepository.find({
      where: { targetCompanyId: companyId },
      order: { createdAt: "DESC" },
      take: 8,
    });

    const subscriptionSnapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(companyId);
    const trustProfileActive = Boolean(
      subscriptionSnapshot?.activePlan.includedModules.includes(
        SubscriptionModuleCode.TrustProfile,
      ),
    );

    return new TrustCompanyPublicProfile({
      companyId,
      scoreValue,
      reviewCount,
      legalName: company.legalName,
      participantTypeCode: company.participantTypeCode,
      countryCode: company.countryCode,
      trustProfileActive,
      distribution,
      recentReviews: recentEntities.map((review) => ({
        scoreValue: review.scoreValue,
        commentText: review.commentText,
        createdAt: review.createdAt.toISOString(),
      })),
    });
  }

  public async submitReview(
    authenticatedUser: AuthenticatedUserContext,
    targetCompanyId: string,
    payload: SubmitCompanyTrustReviewRequestDto,
    locale: string,
  ): Promise<CompanyTrustReviewEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.TrustProfile,
      locale,
    );
    if (targetCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Cannot review own company");
    }
    const company = await this.companyRepository.findOne({
      where: { id: targetCompanyId },
    });
    if (!company) {
      throw new ResourceNotFoundException("Company", targetCompanyId);
    }
    const existing = await this.companyTrustReviewRepository.findOne({
      where: {
        targetCompanyId,
        authorCompanyId: authenticatedUser.companyId,
      },
    });
    if (existing) {
      existing.scoreValue = payload.scoreValue;
      existing.commentText = payload.commentText;
      return this.companyTrustReviewRepository.save(existing);
    }
    return this.companyTrustReviewRepository.save(
      this.companyTrustReviewRepository.create({
        targetCompanyId,
        authorCompanyId: authenticatedUser.companyId,
        scoreValue: payload.scoreValue,
        commentText: payload.commentText,
      }),
    );
  }
}
