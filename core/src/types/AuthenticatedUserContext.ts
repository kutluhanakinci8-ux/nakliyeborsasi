import { CompanyRoleCode } from "../constants/CompanyRoleCode";

export class AuthenticatedUserContext {
  public readonly userId: string;

  public readonly companyId: string;

  public readonly emailAddress: string;

  public readonly roleCodes: readonly CompanyRoleCode[];

  public constructor(params: {
    userId: string;
    companyId: string;
    emailAddress: string;
    roleCodes: readonly CompanyRoleCode[];
  }) {
    this.userId = params.userId;
    this.companyId = params.companyId;
    this.emailAddress = params.emailAddress;
    this.roleCodes = params.roleCodes;
  }
}
