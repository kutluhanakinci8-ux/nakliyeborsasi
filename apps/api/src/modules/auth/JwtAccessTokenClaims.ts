export class JwtAccessTokenClaims {
  public readonly sub: string;

  public readonly companyId: string;

  public readonly emailAddress: string;

  public readonly roleCodes: readonly string[];

  public constructor(params: {
    sub: string;
    companyId: string;
    emailAddress: string;
    roleCodes: readonly string[];
  }) {
    this.sub = params.sub;
    this.companyId = params.companyId;
    this.emailAddress = params.emailAddress;
    this.roleCodes = params.roleCodes;
  }
}
