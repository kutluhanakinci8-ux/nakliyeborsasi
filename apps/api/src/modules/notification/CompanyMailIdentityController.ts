import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
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
import { MailCustomDomainService } from "./MailCustomDomainService";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

import {
  ProvisionMailIdentityDto,
  PilotQuickStartDto,
  RegisterCustomDomainDto,
  SelectMailPlanRequestDto,
} from "./CompanyMailIdentityRequestDto";
import { MailPilotOnboardingService } from "./MailPilotOnboardingService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import {
  assertMailConsoleAccess,
  canManageMailDomain,
  canManageMailIdentity,
} from "./MailCompanyRoleAuthorization";

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
    private readonly mailCustomDomainService: MailCustomDomainService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailPilotOnboardingService: MailPilotOnboardingService,
  ) {}

  @Post("pilot/quick-start")
  public async pilotQuickStart(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: PilotQuickStartDto,
  ) {
    this.assertMailIdentityManager(user);
    const result = await this.mailPilotOnboardingService.quickStart({
      organizationId: user.companyId,
      companyLegalName: body.companyLegalName,
      displayName: body.displayName,
      localPart: body.localPart,
    });
    return { message: "OK", ...result };
  }

  @Get("plans")
  public listMailPlans() {
    return {
      message: "OK",
      plans: this.mailSaasSubscriptionService.listMailPlans(),
    };
  }

  @Get("subscription")
  public async mailSubscription(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    assertMailConsoleAccess(user);
    const subscription =
      await this.mailSaasSubscriptionService.getOrganizationMailPlan(
        user.companyId,
      );
    const sendRateQuota = await this.mailOrganizationSendRateService.getSnapshot(
      user.companyId,
    );
    return {
      message: "OK",
      subscription: {
        ...subscription,
        sendRateQuota,
      },
    };
  }

  @Get("send-rate")
  public async sendRate(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    assertMailConsoleAccess(user);
    const sendRateQuota = await this.mailOrganizationSendRateService.getSnapshot(
      user.companyId,
    );
    return { message: "OK", sendRateQuota };
  }

  @Post("subscription/select")
  public async selectMailPlan(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: SelectMailPlanRequestDto,
  ) {
    const subscription = await this.mailSaasSubscriptionService.selectMailPlan(
      user.companyId,
      user.roleCodes,
      body.planCode,
    );
    return { message: "OK", subscription };
  }

  @Get()
  public async getIdentity(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    assertMailConsoleAccess(user);
    await this.mailTenantSubdomainService.syncTenantDomainVerificationFromDns();
    const identity =
      await this.mailTenantSubdomainService.getOrganizationMailIdentity(
        user.companyId,
      );
    return {
      message: "OK",
      identity,
      sendRate: await this.mailOrganizationSendRateService.getSnapshot(
        user.companyId,
      ),
      replyToHintTr:
        "Yanıtlar şimdilik platform destek hattına yönlendirilir; tam posta kutusu Faz C.",
    };
  }

  @Get("senders")
  public async listSenders(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    assertMailConsoleAccess(user);
    const senders = await this.mailSaasSubscriptionService.listOrganizationSenders(
      user.companyId,
    );
    const subscription =
      await this.mailSaasSubscriptionService.getOrganizationMailPlan(
        user.companyId,
      );
    return {
      message: "OK",
      senders,
      mailboxQuota: subscription.mailboxQuota,
    };
  }

  @Post("senders/:senderId/default")
  public async setDefaultSender(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("senderId") senderId: string,
  ) {
    this.assertMailIdentityManager(user);
    await this.mailSaasSubscriptionService.setDefaultSender(
      user.companyId,
      senderId,
    );
    const senders = await this.mailSaasSubscriptionService.listOrganizationSenders(
      user.companyId,
    );
    return { message: "OK", senders };
  }

  @Post("provision")
  public async provision(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ProvisionMailIdentityDto,
  ) {
    this.assertMailIdentityManager(user);
    const result = await this.mailTenantSubdomainService.provisionPilotSender({
      organizationId: user.companyId,
      localPart: body.localPart,
      displayName: body.displayName,
      makeDefault: body.makeDefault,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SenderProvisioned,
      {
        organizationId: user.companyId,
        fromAddress: result.fromAddress,
        channel: "tenant_subdomain",
        localPart: body.localPart,
      },
      "/company/mail-identity/provision",
    );
    return { message: "OK", ...result };
  }

  @Get("custom-domain")
  public async getCustomDomain(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    assertMailConsoleAccess(user);
    const bundle = await this.mailCustomDomainService.getOrganizationBundle(
      user.companyId,
    );
    return { message: "OK", bundle };
  }

  @Post("custom-domain")
  public async registerCustomDomain(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: RegisterCustomDomainDto,
  ) {
    this.assertMailDomainManager(user);
    await this.mailSaasSubscriptionService.assertCustomDomainAllowed(
      user.companyId,
    );
    const bundle = await this.mailCustomDomainService.registerForOrganization(
      user.companyId,
      body.domain,
    );
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.CustomDomainRegistered,
      {
        organizationId: user.companyId,
        domain: bundle.mailDomain?.domain ?? body.domain,
        mailDomainId: bundle.mailDomain?.id ?? null,
      },
      "/company/mail-identity/custom-domain",
    );
    return { message: "OK", bundle };
  }

  @Post("custom-domain/verify-dns")
  public async verifyCustomDomainDns(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    this.assertMailDomainManager(user);
    try {
      const domain =
        await this.mailCustomDomainService.verifyAndMarkOrganizationDomain(
          user.companyId,
        );
      await this.mailIdentityAuditService.recordFromUser(
        user,
        MailIdentityAuditAction.CustomDomainDnsVerified,
        {
          organizationId: user.companyId,
          domain: domain.domain,
          mailDomainId: domain.id,
        },
        "/company/mail-identity/custom-domain/verify-dns",
      );
      return { message: "OK", domain };
    } catch (error) {
      if (error instanceof BadRequestException) {
        await this.mailIdentityAuditService.recordFromUser(
          user,
          MailIdentityAuditAction.CustomDomainDnsFailed,
          {
            organizationId: user.companyId,
            detail: error.getResponse(),
          },
          "/company/mail-identity/custom-domain/verify-dns",
        );
      }
      throw error;
    }
  }

  @Post("custom-domain/provision")
  public async provisionCustomDomainSender(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ProvisionMailIdentityDto,
  ) {
    this.assertMailIdentityManager(user);
    const result = await this.mailCustomDomainService.provisionSender({
      organizationId: user.companyId,
      localPart: body.localPart,
      displayName: body.displayName,
      makeDefault: body.makeDefault,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SenderProvisioned,
      {
        organizationId: user.companyId,
        fromAddress: result.fromAddress,
        channel: "custom_domain",
        localPart: body.localPart,
      },
      "/company/mail-identity/custom-domain/provision",
    );
    return { message: "OK", ...result };
  }

  @Get("suppressions")
  public async listSuppressions(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    assertMailConsoleAccess(user);
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
    this.assertMailIdentityManager(user);
    const row = await this.emailSuppressionService.addSuppression({
      email: body.email,
      reason: body.reason ?? "manual",
      source: "org_admin",
      note: body.note,
      organizationId: user.companyId,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SuppressionAdded,
      {
        organizationId: user.companyId,
        email: body.email,
        reason: body.reason ?? "manual",
      },
      "/company/mail-identity/suppressions",
    );
    return { suppression: row };
  }

  @Delete("suppressions")
  public async removeSuppression(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("email") email: string,
  ) {
    this.assertMailIdentityManager(user);
    const removed = await this.emailSuppressionService.removeSuppression(
      email,
      user.companyId,
    );
    if (removed) {
      await this.mailIdentityAuditService.recordFromUser(
        user,
        MailIdentityAuditAction.SuppressionRemoved,
        {
          organizationId: user.companyId,
          email,
        },
        "/company/mail-identity/suppressions",
      );
    }
    return { ok: removed };
  }

  @Patch("display-name")
  public async updateDisplayName(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: UpdateCompanyMailDisplayNameDto,
  ) {
    this.assertMailIdentityManager(user);
    const sender =
      await this.mailTenantSubdomainService.updateOrganizationSenderDisplayName(
        user.companyId,
        body.displayName,
      );
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.DisplayNameUpdated,
      {
        organizationId: user.companyId,
        displayName: body.displayName,
        senderId: sender.id,
      },
      "/company/mail-identity/display-name",
    );
    return { message: "OK", sender };
  }

  private assertMailIdentityManager(user: AuthenticatedUserContext): void {
    if (!canManageMailIdentity(user)) {
      throw new ForbiddenException(
        "Posta kimliği yalnızca firma sahibi veya posta yöneticisi tarafından yönetilebilir.",
      );
    }
  }

  private assertMailDomainManager(user: AuthenticatedUserContext): void {
    if (!canManageMailDomain(user)) {
      throw new ForbiddenException(
        "Özel domain yalnızca firma sahibi tarafından yönetilebilir.",
      );
    }
  }
}
