import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { PlatformMailRoadmapService } from "./PlatformMailRoadmapService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailCustomDomainService } from "./MailCustomDomainService";
import { MailDomainType } from "../../infrastructure/database/entities/MailDomainEntity";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";
import { MailInboundIngestService } from "./MailInboundIngestService";
import { MailInboundRoutingService } from "./MailInboundRoutingService";
import { MailImapAccessService } from "./MailImapAccessService";
import { PlatformMailTenantAdminService } from "./PlatformMailTenantAdminService";
import { MailDmarcAggregateService } from "./MailDmarcAggregateService";
import { IngestDmarcReportRequestDto } from "./IngestDmarcReportRequestDto";
import { MailPlatformMonitoringService } from "./MailPlatformMonitoringService";
import { MailPlatformKpiService } from "./MailPlatformKpiService";
import { MailBillingService } from "./MailBillingService";
import { MailInstantPostDomainService } from "./MailInstantPostDomainService";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";

@Controller("platform-admin/mail")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformMailIdentityAdminController {
  public constructor(
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly platformMailRoadmapService: PlatformMailRoadmapService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailCustomDomainService: MailCustomDomainService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
    private readonly mailInboundIngestService: MailInboundIngestService,
    private readonly mailInboundRoutingService: MailInboundRoutingService,
    private readonly mailImapAccessService: MailImapAccessService,
    private readonly platformMailTenantAdminService: PlatformMailTenantAdminService,
    private readonly mailDmarcAggregateService: MailDmarcAggregateService,
    private readonly mailPlatformMonitoringService: MailPlatformMonitoringService,
    private readonly mailPlatformKpiService: MailPlatformKpiService,
    private readonly mailBillingService: MailBillingService,
    private readonly mailInstantPostDomainService: MailInstantPostDomainService,
    @InjectRepository(MailDomainEntity)
    private readonly mailDomainRepository: Repository<MailDomainEntity>,
  ) {}

  @Get("billing-health")
  public async billingHealth() {
    const status = await this.mailBillingService.getBillingStatus();
    const a1 = this.mailBillingService.buildA1Acceptance(status);
    return { message: "OK", status, a1 };
  }

  @Get("kpi")
  public async kpi() {
    return { kpi: await this.mailPlatformKpiService.buildSnapshot() };
  }

  @Get("monitoring")
  public async monitoring() {
    return {
      monitoring: await this.mailPlatformMonitoringService.buildSnapshot(),
    };
  }

  @Post("dmarc/ingest")
  public async ingestDmarcReport(@Body() body: IngestDmarcReportRequestDto) {
    if (body.xml?.trim()) {
      const row = await this.mailDmarcAggregateService.ingestFromXml({
        xml: body.xml,
        organizationId: body.organizationId ?? null,
      });
      return { ok: true, report: row };
    }
    if (body.summary) {
      const row = await this.mailDmarcAggregateService.ingestSummary({
        domain: body.summary.domain.toLowerCase(),
        periodStart: new Date(body.summary.periodStart),
        periodEnd: new Date(body.summary.periodEnd),
        messageCount: body.summary.messageCount,
        dispositionNone: body.summary.disposition.none,
        dispositionQuarantine: body.summary.disposition.quarantine,
        dispositionReject: body.summary.disposition.reject,
        dkimPass: body.summary.dkim.pass,
        dkimFail: body.summary.dkim.fail,
        spfPass: body.summary.spf.pass,
        spfFail: body.summary.spf.fail,
        reporterOrgName: body.summary.reporterOrgName ?? null,
        organizationId: body.organizationId ?? null,
      });
      return { ok: true, report: row };
    }
    throw new BadRequestException("xml veya summary gerekli");
  }

  @Get("tenants")
  public async listTenants() {
    return {
      tenants: await this.platformMailTenantAdminService.listTenants(),
    };
  }

  @Post("tenants/:organizationId/suspend")
  public async suspendTenant(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("organizationId") organizationId: string,
    @Body() body: { reason?: string; abuseFlag?: boolean },
  ) {
    const tenant = await this.platformMailTenantAdminService.suspendTenant(
      user,
      organizationId,
      body,
    );
    return { ok: true, tenant };
  }

  @Post("tenants/:organizationId/unsuspend")
  public async unsuspendTenant(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("organizationId") organizationId: string,
  ) {
    const tenant = await this.platformMailTenantAdminService.unsuspendTenant(
      user,
      organizationId,
    );
    return { ok: true, tenant };
  }

  @Patch("tenants/:organizationId/note")
  public async updateTenantNote(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("organizationId") organizationId: string,
    @Body() body: { note: string },
  ) {
    const tenant = await this.platformMailTenantAdminService.updateTenantNote(
      user,
      organizationId,
      body.note ?? "",
    );
    return { ok: true, tenant };
  }

  @Post("imap/sync-dovecot")
  public async syncDovecotImap() {
    return await this.mailImapAccessService.syncDovecotPasswdFile();
  }

  @Get("roadmap")
  public async roadmap() {
    return {
      snapshot: await this.platformMailRoadmapService.buildSnapshot(),
    };
  }

  @Get("identity-audit")
  public async identityAudit() {
    return { logs: await this.mailIdentityAuditService.listRecent() };
  }

  @Get("inbound-messages")
  public async listInboundMessages() {
    return {
      messages: await this.mailInboundIngestService.listRecentForAdmin(),
    };
  }

  @Get("inbound-routing")
  public async inboundRouting() {
    return {
      snapshot: await this.mailInboundRoutingService.buildRoutingSnapshot(),
    };
  }

  @Post("inbound-routing/sync-postfix")
  public async syncPostfixInboundRouting() {
    return await this.mailInboundRoutingService.writePostfixVirtualMap();
  }

  @Post("inbound-messages/simulate")
  public async simulateInbound(
    @Body()
    body: {
      recipient: string;
      sender?: string;
      subject?: string;
      text?: string;
    },
  ) {
    const message = await this.mailInboundIngestService.ingest(body);
    return { ok: true, message };
  }

  @Get("domains")
  public async listDomains() {
    const domains = await this.mailDomainApplicationService.listDomains();
    return { domains };
  }

  @Post("domains")
  public async createDomain(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      organizationId: string;
      domain: string;
      domainType?: MailDomainType;
      notes?: string;
    },
  ) {
    const domainType = body.domainType ?? "custom";
    if (domainType === "custom" && body.organizationId) {
      const bundle = await this.mailCustomDomainService.registerForOrganization(
        body.organizationId,
        body.domain,
      );
      if (!bundle.mailDomain) {
        throw new BadRequestException("Custom domain registration failed");
      }
      await this.mailIdentityAuditService.recordFromUser(
        user,
        MailIdentityAuditAction.AdminDomainCreated,
        {
          organizationId: body.organizationId,
          domain: bundle.mailDomain.domain,
          mailDomainId: bundle.mailDomain.id,
          domainType: "custom",
        },
        "/platform-admin/mail/domains",
      );
      return { domain: bundle.mailDomain };
    }
    const domain = await this.mailDomainApplicationService.createDomain({
      organizationId: body.organizationId,
      domain: body.domain,
      domainType,
      notes: body.notes,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.AdminDomainCreated,
      {
        organizationId: body.organizationId,
        domain: domain.domain,
        mailDomainId: domain.id,
        domainType,
      },
      "/platform-admin/mail/domains",
    );
    return { domain };
  }

  @Patch("domains/:domainId/verify")
  public async verifyDomain(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("domainId") domainId: string,
  ) {
    const domain =
      await this.mailDomainApplicationService.markVerified(domainId);
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.AdminDomainManuallyVerified,
      {
        mailDomainId: domainId,
        domain: domain.domain,
        organizationId: domain.organizationId,
      },
      `/platform-admin/mail/domains/${domainId}/verify`,
    );
    return { domain };
  }

  @Post("domains/:domainId/verify-dns")
  public async verifyDomainDns(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("domainId") domainId: string,
  ) {
    const result = await this.mailCustomDomainService.verifyDomainById(domainId);
    await this.mailIdentityAuditService.recordFromUser(
      user,
      result.dnsCheck.ok
        ? MailIdentityAuditAction.AdminDomainDnsVerified
        : MailIdentityAuditAction.CustomDomainDnsFailed,
      {
        mailDomainId: domainId,
        domain: result.domain.domain,
        organizationId: result.domain.organizationId,
        dnsOk: result.dnsCheck.ok,
      },
      `/platform-admin/mail/domains/${domainId}/verify-dns`,
    );
    return { ok: result.dnsCheck.ok, ...result };
  }

  @Get("tenant-subdomain/pilot")
  public async tenantPilotBundle() {
    return {
      bundle: await this.mailTenantSubdomainService.getPilotBundle(),
    };
  }

  @Post("tenant-subdomain/verify-dns")
  public async verifyTenantDns(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const domain = await this.mailTenantSubdomainService.verifyTenantDomainDns();
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.TenantSubdomainDnsVerified,
      { domain: domain.domain, mailDomainId: domain.id },
      "/platform-admin/mail/tenant-subdomain/verify-dns",
    );
    return { domain };
  }

  @Post("instant-post/switch-primary")
  public async switchOrganizationToLertaPost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      organizationId?: string;
      lookupCustomDomain?: string;
      orgSlug: string;
      localPart?: string;
      displayName?: string;
    },
  ) {
    let organizationId = body.organizationId?.trim();
    if (!organizationId && body.lookupCustomDomain?.trim()) {
      const domain = body.lookupCustomDomain.trim().toLowerCase();
      const row = await this.mailDomainRepository.findOne({
        where: { domain, domainType: "custom" },
      });
      organizationId = row?.organizationId ?? undefined;
    }
    if (!organizationId) {
      throw new BadRequestException(
        "organizationId veya lookupCustomDomain (ör. abayer.com) gerekli.",
      );
    }
    const result =
      await this.mailInstantPostDomainService.switchOrganizationPrimaryToPost({
        organizationId,
        orgSlug: body.orgSlug,
        localPart: body.localPart?.trim() || "info",
        displayName: body.displayName,
      });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SenderProvisioned,
      {
        organizationId,
        fromAddress: result.fromAddress,
        vanityAddress: result.vanityAddress,
        previousFromAddress: result.previousFromAddress,
        channel: "instant_post",
        migration: "switch-primary",
      },
      "/platform-admin/mail/instant-post/switch-primary",
    );
    return { message: "OK", ...result };
  }

  @Post("tenant-subdomain/provision")
  public async provisionTenantSender(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      organizationId: string;
      localPart: string;
      displayName?: string;
    },
  ) {
    const result = await this.mailTenantSubdomainService.provisionPilotSender({
      organizationId: body.organizationId,
      localPart: body.localPart,
      displayName: body.displayName,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.TenantSubdomainProvisioned,
      {
        organizationId: body.organizationId,
        fromAddress: result.fromAddress,
        localPart: body.localPart,
      },
      "/platform-admin/mail/tenant-subdomain/provision",
    );
    return result;
  }

  @Post("domains/:domainId/senders")
  public async addSender(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("domainId") domainId: string,
    @Body()
    body: {
      organizationId: string;
      localPart: string;
      displayName?: string;
      isDefault?: boolean;
    },
  ) {
    const sender = await this.mailDomainApplicationService.addSenderIdentity({
      mailDomainId: domainId,
      organizationId: body.organizationId,
      localPart: body.localPart,
      displayName: body.displayName,
      isDefault: body.isDefault,
    });
    await this.mailIdentityAuditService.recordFromUser(
      user,
      MailIdentityAuditAction.SenderProvisioned,
      {
        organizationId: body.organizationId,
        mailDomainId: domainId,
        localPart: body.localPart,
        senderId: sender.id,
        channel: "admin_manual",
      },
      `/platform-admin/mail/domains/${domainId}/senders`,
    );
    return { sender };
  }
}
