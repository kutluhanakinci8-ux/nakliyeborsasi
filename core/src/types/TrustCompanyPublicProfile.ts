export type TrustReviewPublicItem = {
  scoreValue: number;
  commentText: string;
  createdAt: string;
};

export type TrustScoreDistributionBucket = {
  scoreValue: number;
  count: number;
};

export class TrustCompanyPublicProfile {
  public readonly companyId: string;

  public readonly scoreValue: number;

  public readonly reviewCount: number;

  public readonly legalName: string;

  public readonly participantTypeCode: string | null;

  public readonly countryCode: string;

  public readonly trustProfileActive: boolean;

  public readonly distribution: TrustScoreDistributionBucket[];

  public readonly recentReviews: TrustReviewPublicItem[];

  public constructor(params: {
    companyId: string;
    scoreValue: number;
    reviewCount: number;
    legalName: string;
    participantTypeCode: string | null;
    countryCode: string;
    trustProfileActive: boolean;
    distribution: TrustScoreDistributionBucket[];
    recentReviews: TrustReviewPublicItem[];
  }) {
    this.companyId = params.companyId;
    this.scoreValue = params.scoreValue;
    this.reviewCount = params.reviewCount;
    this.legalName = params.legalName;
    this.participantTypeCode = params.participantTypeCode;
    this.countryCode = params.countryCode;
    this.trustProfileActive = params.trustProfileActive;
    this.distribution = params.distribution;
    this.recentReviews = params.recentReviews;
  }
}
