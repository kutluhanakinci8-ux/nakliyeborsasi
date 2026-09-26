import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { resolveMailSenderAddresses } from "@nakliyeborsasi/core";
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
    const addressPair = mailDomain
      ? resolveMailSenderAddresses(sender!.localPart, mailDomain)
      : null;
    const fromAddress = addressPair?.technicalAddress ?? null;

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
    const vanityAddress =
      addressPair &&
      addressPair.publicAddress !== addressPair.technicalAddress
        ? addressPair.publicAddress
        : null;
    const displayAddress = addressPair?.publicAddress ?? fromAddress;

    if (channel === "instant_post") {
      const wildcardDnsReady =
        await this.mailInstantPostDomainService.platformPostDnsReady();
      const managed =
        mailDomain.dnsSnapshot?.managedByPlatform === true ||
        mailDomain.dnsSnapshot?.product === "lerta_post";
      return {
        fromAddress: displayAddress,
        vanityAddress,
        displayAddress,
        channel,
        domain: mailDomain.domain,
        domainVerified: mailDomain.verificationStatus === "verified",
        platformDnsReady: wildcardDnsReady || managed,
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

}
