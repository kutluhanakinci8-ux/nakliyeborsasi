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
  ) {}

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
