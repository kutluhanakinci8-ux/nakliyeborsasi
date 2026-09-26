import {
  formatMailFromHeader,
  resolveMailSenderAddresses,
} from "@nakliyeborsasi/core";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { MailOrganizationBrandingService } from "./MailOrganizationBrandingService";

@Injectable()
export class MailSenderResolutionService {
  public constructor(
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly mailOrganizationBrandingService: MailOrganizationBrandingService,
  ) {}

  public async resolveFromForOutbox(
    metadata: Record<string, unknown> | null | undefined,
  ): Promise<{ from: string; tenantOrganizationId: string | null }> {
    const fallback =
      this.notificationConfigurationService.resolveSmtpConfig().from;
    const companyId =
      typeof metadata?.companyId === "string" ? metadata.companyId : null;
    if (!companyId) {
      return { from: fallback, tenantOrganizationId: null };
    }
    const identity = await this.senderRepository.findOne({
      where: { organizationId: companyId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!identity?.mailDomain) {
      return { from: fallback, tenantOrganizationId: null };
    }
    if (identity.mailDomain.verificationStatus !== "verified") {
      return { from: fallback, tenantOrganizationId: null };
    }
    const { publicAddress } = resolveMailSenderAddresses(
      identity.localPart,
      identity.mailDomain,
    );
    const brandingName =
      await this.mailOrganizationBrandingService.resolveDefaultFromDisplayName(
        companyId,
      );
    const displayName =
      brandingName?.trim() || identity.displayName?.trim() || "";
    const from = formatMailFromHeader(publicAddress, displayName);
    return { from, tenantOrganizationId: companyId };
  }
}
