import {
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
import { MailDomainType } from "../../infrastructure/database/entities/MailDomainEntity";

@Controller("platform-admin/mail")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformMailIdentityAdminController {
  public constructor(
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly platformMailRoadmapService: PlatformMailRoadmapService,
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
    const domain = await this.mailDomainApplicationService.createDomain({
      organizationId: body.organizationId,
      domain: body.domain,
      domainType: body.domainType ?? "custom",
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
