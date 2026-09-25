import { CompanyRoleCode } from "@nakliyeborsasi/core";

export class CreateMailTeamInviteDto {
  public email!: string;
  public roleCode!: CompanyRoleCode;
}

export class UpdateMailTeamMemberRoleDto {
  public roleCode!: CompanyRoleCode;
}

export class AcceptMailTeamInviteDto {
  public token!: string;
  public password?: string;
  public displayName?: string;
}
