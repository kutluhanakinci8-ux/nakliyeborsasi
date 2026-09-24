import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CompanyRoleCode, AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";

class ProvisionCompanyMailIdentityDto {
  public localPart!: string;
  public displayName?: string;
}

class UpdateCompanyMailDisplayNameDto {
  public displayName!: string;
}

@Controller("company/mail-identity")
@UseGuards(JwtAuthenticationGuard)
export class CompanyMailIdentityController {
  public constructor(
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
  ) {}

  @Get()
  public async getIdentity(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    await this.mailTenantSubdomainService.syncTenantDomainVerificationFromDns();
    const identity =
      await this.mailTenantSubdomainService.getOrganizationMailIdentity(
        user.companyId,
      );
    return {
      message: "OK",
      identity,
      replyToHintTr:
        "Yanıtlar şimdilik platform destek hattına yönlendirilir; tam posta kutusu Faz C.",
    };
  }

  @Post("provision")
  public async provision(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ProvisionCompanyMailIdentityDto,
  ) {
    this.assertCompanyOwner(user);
    const result = await this.mailTenantSubdomainService.provisionPilotSender({
      organizationId: user.companyId,
      localPart: body.localPart,
      displayName: body.displayName,
    });
    return { message: "OK", ...result };
  }

  @Patch("display-name")
  public async updateDisplayName(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: UpdateCompanyMailDisplayNameDto,
  ) {
    this.assertCompanyOwner(user);
    const sender =
      await this.mailTenantSubdomainService.updateOrganizationSenderDisplayName(
        user.companyId,
        body.displayName,
      );
    return { message: "OK", sender };
  }

  private assertCompanyOwner(user: AuthenticatedUserContext): void {
    if (!user.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new ForbiddenException(
        "Kurumsal e-posta kimliği yalnızca firma sahibi tarafından yönetilebilir.",
      );
    }
  }
}
