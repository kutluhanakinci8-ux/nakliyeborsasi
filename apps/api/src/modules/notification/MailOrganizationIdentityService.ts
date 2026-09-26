import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PLATFORM_MAIL_INSTANT_POST_ZONE,
  formatInstantPostVanityEmail,
} from "@nakliyeborsasi/core";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { MailInstantPostDomainService } from "./MailInstantPostDomainService";

export type OrganizationMailChannel =
  | "instant_post"
  | "custom_domain"
  | "tenant_subdomain"
  | "platform"
  | "unknown";

@Injectable()
export class MailOrganizationIdentityService {
  public constructor(
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    private readonly mailInstantPostDomainService: MailInstantPostDomainService,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async getPrimaryIdentity(organizationId: string): Promise<{
    fromAddress: string | null;
    vanityAddress: string | null;
    displayAddress: string | null;
    channel: OrganizationMailChannel;
    domain: string;
    domainVerified: boolean;
    platformDnsReady: boolean;
    sender: MailSenderIdentityEntity | null;
  }> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    const mailDomain = sender?.mailDomain ?? null;
    const fromAddress = mailDomain
      ? `${sender!.localPart}@${mailDomain.domain}`
      : null;

    if (!mailDomain || !fromAddress) {
      const tenantDomain =
        this.mailDomainDnsVerificationService.resolveTenantMailDomain();
      const dnsCheck =
        await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
      return {
        fromAddress: null,
        vanityAddress: null,
        displayAddress: null,
        channel: "unknown",
        domain: tenantDomain,
        domainVerified: false,
        platformDnsReady: dnsCheck.ok,
        sender: null,
      };
    }

    const channel = this.resolveChannel(mailDomain);
    const vanityAddress = this.resolveVanityAddress(sender!, mailDomain);
    const displayAddress = vanityAddress ?? fromAddress;

    if (channel === "instant_post") {
      const publicDnsReady =
        await this.mailInstantPostDomainService.platformPostDnsReady();
      return {
        fromAddress,
        vanityAddress,
        displayAddress,
        channel,
        domain: mailDomain.domain,
        domainVerified: mailDomain.verificationStatus === "verified",
        platformDnsReady: publicDnsReady,
        sender,
      };
    }

    if (channel === "custom_domain") {
      const bundleDns = mailDomain.verificationStatus === "verified";
      return {
        fromAddress,
        vanityAddress,
        displayAddress,
        channel,
        domain: mailDomain.domain,
        domainVerified: bundleDns,
        platformDnsReady: bundleDns,
        sender,
      };
    }

    if (channel === "tenant_subdomain") {
      const dnsCheck =
        await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
      return {
        fromAddress,
        vanityAddress,
        displayAddress,
        channel,
        domain: mailDomain.domain,
        domainVerified: mailDomain.verificationStatus === "verified",
        platformDnsReady: dnsCheck.ok,
        sender,
      };
    }

    return {
      fromAddress,
      vanityAddress,
      displayAddress,
      channel,
      domain: mailDomain.domain,
      domainVerified: mailDomain.verificationStatus === "verified",
      platformDnsReady: false,
      sender,
    };
  }

  private resolveChannel(mailDomain: MailDomainEntity): OrganizationMailChannel {
    if (
      mailDomain.domainType === "instant_post" ||
      mailDomain.domainType === "instant_box"
    ) {
      return "instant_post";
    }
    if (mailDomain.domainType === "custom") {
      return "custom_domain";
    }
    if (mailDomain.domainType === "subdomain") {
      return "tenant_subdomain";
    }
    return "platform";
  }

  private resolveVanityAddress(
    sender: MailSenderIdentityEntity,
    mailDomain: MailDomainEntity,
  ): string | null {
    if (
      mailDomain.domainType !== "instant_post" &&
      mailDomain.domainType !== "instant_box"
    ) {
      return null;
    }
    const suffix = `.${PLATFORM_MAIL_INSTANT_POST_ZONE}`;
    if (!mailDomain.domain.endsWith(suffix)) {
      return null;
    }
    const orgSlug = mailDomain.domain.slice(0, -suffix.length);
    if (!orgSlug) {
      return null;
    }
    return formatInstantPostVanityEmail(sender.localPart, orgSlug);
  }
}
