import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CompanyRoleCode, AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailOrganizationSendRateService } from "./MailOrganizationSendRateService";
import { EmailSuppressionService } from "./EmailSuppressionService";

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
    private readonly mailOrganizationSendRateService: MailOrganizationSendRateService,
    private readonly emailSuppressionService: EmailSuppressionService,
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
      sendRate: this.mailOrganizationSendRateService.getSnapshot(
        user.companyId,
      ),
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

  @Get("suppressions")
  public async listSuppressions(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return {
      suppressions: await this.emailSuppressionService.listForOrganization(
        user.companyId,
      ),
    };
  }

  @Post("suppressions")
  public async addSuppression(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: { email: string; reason?: string; note?: string },
  ) {
    this.assertCompanyOwner(user);
    const row = await this.emailSuppressionService.addSuppression({
      email: body.email,
      reason: body.reason ?? "manual",
      source: "org_admin",
      note: body.note,
      organizationId: user.companyId,
    });
    return { suppression: row };
  }

  @Delete("suppressions")
  public async removeSuppression(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("email") email: string,
  ) {
    this.assertCompanyOwner(user);
    const removed = await this.emailSuppressionService.removeSuppression(
      email,
      user.companyId,
    );
    return { ok: removed };
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
