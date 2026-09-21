export class TrustScoreSnapshot {
  public readonly companyId: string;

  public readonly scoreValue: number;

  public readonly reviewCount: number;

  public constructor(params: {
    companyId: string;
    scoreValue: number;
    reviewCount: number;
  }) {
    this.companyId = params.companyId;
    this.scoreValue = params.scoreValue;
    this.reviewCount = params.reviewCount;
  }
}
