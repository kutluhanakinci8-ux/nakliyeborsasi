import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SubscriptionModuleCode,
  TrustScoreSnapshot,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { SubmitCompanyTrustReviewRequestDto } from "./SubmitCompanyTrustReviewRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";

@Injectable()
export class TrustScoreApplicationService {
  public constructor(
    @InjectRepository(CompanyTrustReviewEntity)
    private readonly companyTrustReviewRepository: Repository<CompanyTrustReviewEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
  ) {}

  public async getCompanyTrustSnapshot(
    companyId: string,
  ): Promise<TrustScoreSnapshot> {
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
    return new TrustScoreSnapshot({
      companyId,
      scoreValue,
      reviewCount,
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
