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
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { PlatformMailRoadmapService } from "./PlatformMailRoadmapService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailCustomDomainService } from "./MailCustomDomainService";
import { MailDomainType } from "../../infrastructure/database/entities/MailDomainEntity";

@Controller("platform-admin/mail")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformMailIdentityAdminController {
  public constructor(
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly platformMailRoadmapService: PlatformMailRoadmapService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailCustomDomainService: MailCustomDomainService,
  ) {}

  @Get("roadmap")
  public async roadmap() {
    return {
      snapshot: await this.platformMailRoadmapService.buildSnapshot(),
    };
  }

  @Get("domains")
  public async listDomains() {
    const domains = await this.mailDomainApplicationService.listDomains();
    return { domains };
  }

  @Post("domains")
  public async createDomain(
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
      return { domain: bundle.mailDomain };
    }
    const domain = await this.mailDomainApplicationService.createDomain({
      organizationId: body.organizationId,
      domain: body.domain,
      domainType,
      notes: body.notes,
    });
    return { domain };
  }

  @Patch("domains/:domainId/verify")
  public async verifyDomain(@Param("domainId") domainId: string) {
    const domain =
      await this.mailDomainApplicationService.markVerified(domainId);
    return { domain };
  }

  @Post("domains/:domainId/verify-dns")
  public async verifyDomainDns(@Param("domainId") domainId: string) {
    const result = await this.mailCustomDomainService.verifyDomainById(domainId);
    return { ok: result.dnsCheck.ok, ...result };
  }

  @Get("tenant-subdomain/pilot")
  public async tenantPilotBundle() {
    return {
      bundle: await this.mailTenantSubdomainService.getPilotBundle(),
    };
  }

  @Post("tenant-subdomain/verify-dns")
  public async verifyTenantDns() {
    const domain = await this.mailTenantSubdomainService.verifyTenantDomainDns();
    return { domain };
  }

  @Post("tenant-subdomain/provision")
  public async provisionTenantSender(
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
    return result;
  }

  @Post("domains/:domainId/senders")
  public async addSender(
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
    return { sender };
  }
}
