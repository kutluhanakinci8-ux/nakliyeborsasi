import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

@Injectable()
export class MailSenderResolutionService {
  public constructor(
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public async resolveFromForOutbox(
    metadata: Record<string, unknown> | null | undefined,
  ): Promise<string> {
    const fallback =
      this.notificationConfigurationService.resolveSmtpConfig().from;
    const companyId =
      typeof metadata?.companyId === "string" ? metadata.companyId : null;
    if (!companyId) {
      return fallback;
    }
    const identity = await this.senderRepository.findOne({
      where: { organizationId: companyId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!identity?.mailDomain) {
      return fallback;
    }
    if (identity.mailDomain.verificationStatus !== "verified") {
      return fallback;
    }
    const email = `${identity.localPart}@${identity.mailDomain.domain}`.toLowerCase();
    if (identity.displayName?.trim()) {
      return `${identity.displayName.trim()} <${email}>`;
    }
    return email;
  }
}
