import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  AuthenticatedUserContext,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { CompanyMailTeamService } from "./CompanyMailTeamService";
import {
  AcceptMailTeamInviteDto,
  CreateMailTeamInviteDto,
  UpdateMailTeamMemberRoleDto,
} from "./CompanyMailTeamRequestDto";
import {
  assertMailConsoleAccess,
  canManageMailTeam,
} from "./MailCompanyRoleAuthorization";

@Controller("company/mail-identity/team")
@UseGuards(JwtAuthenticationGuard)
export class CompanyMailTeamController {
  public constructor(
    private readonly companyMailTeamService: CompanyMailTeamService,
  ) {}

  @Get()
  public async listTeam(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    assertMailConsoleAccess(user);
    const team = await this.companyMailTeamService.listTeam(user.companyId);
    return {
      message: "OK",
      team,
      permissions: {
        canInvite: canManageMailTeam(user),
        canManageRoles: user.roleCodes.includes(CompanyRoleCode.CompanyOwner),
      },
    };
  }

  @Post("invites")
  public async createInvite(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: CreateMailTeamInviteDto,
  ) {
    assertMailConsoleAccess(user);
    const team = await this.companyMailTeamService.createInvite(
      user,
      body.email,
      body.roleCode,
    );
    return { message: "OK", team };
  }

  @Delete("invites/:inviteId")
  public async revokeInvite(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("inviteId") inviteId: string,
  ) {
    assertMailConsoleAccess(user);
    const team = await this.companyMailTeamService.revokeInvite(user, inviteId);
    return { message: "OK", team };
  }

  @Patch("members/:membershipId/role")
  public async updateMemberRole(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("membershipId") membershipId: string,
    @Body() body: UpdateMailTeamMemberRoleDto,
  ) {
    assertMailConsoleAccess(user);
    const team = await this.companyMailTeamService.updateMemberRole(
      user,
      membershipId,
      body.roleCode,
    );
    return { message: "OK", team };
  }

  @Delete("members/:membershipId")
  public async removeMember(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("membershipId") membershipId: string,
  ) {
    assertMailConsoleAccess(user);
    const team = await this.companyMailTeamService.removeMember(
      user,
      membershipId,
    );
    return { message: "OK", team };
  }
}

@Controller("auth/mail-team-invite")
export class MailTeamInvitePublicController {
  public constructor(
    private readonly companyMailTeamService: CompanyMailTeamService,
  ) {}

  @Get("preview")
  public async preview(@Query("token") token?: string) {
    if (!token?.trim()) {
      return { message: "TOKEN_REQUIRED" };
    }
    const preview = await this.companyMailTeamService.previewInvite(token);
    return { message: "OK", preview };
  }

  @Post("accept")
  public async accept(@Body() body: AcceptMailTeamInviteDto) {
    const result = await this.companyMailTeamService.acceptInvite(body);
    return { message: "OK", ...result };
  }
}
