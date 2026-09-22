import { CompanyRoleCode } from "../constants/CompanyRoleCode";
import { CompanyParticipantTypeCode } from "../constants/CompanyParticipantTypeCode";

export class AuthenticatedUserContext {
  public readonly userId: string;

  public readonly companyId: string;

  public readonly emailAddress: string;

  public readonly roleCodes: readonly CompanyRoleCode[];

  public readonly companyParticipantTypeCode: CompanyParticipantTypeCode | null;

  public constructor(params: {
    userId: string;
    companyId: string;
    emailAddress: string;
    roleCodes: readonly CompanyRoleCode[];
    companyParticipantTypeCode?: CompanyParticipantTypeCode | null;
  }) {
    this.userId = params.userId;
    this.companyId = params.companyId;
    this.emailAddress = params.emailAddress;
    this.roleCodes = params.roleCodes;
    this.companyParticipantTypeCode = params.companyParticipantTypeCode ?? null;
  }
}
