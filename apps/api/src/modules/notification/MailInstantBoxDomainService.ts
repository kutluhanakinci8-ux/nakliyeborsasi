import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PLATFORM_MAIL_INSTANT_BOX_ZONE,
  formatInstantBoxVanityEmail,
  instantBoxFqdnForOrgSlug,
  isInstantBoxMailDomain,
} from "@nakliyeborsasi/core";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

@Injectable()
export class MailInstantBoxDomainService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public resolveZone(): string {
    return (
      this.configService
        .get<string>("MAIL_PLATFORM_INSTANT_BOX_ZONE")
        ?.trim() || PLATFORM_MAIL_INSTANT_BOX_ZONE
    );
  }

  public fqdnForSlug(orgSlug: string): string {
    const slug = this.normalizeOrgSlug(orgSlug);
    const zone = this.resolveZone();
    return `${slug}.${zone}`;
  }

  public normalizeOrgSlug(slug: string): string {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(normalized)) {
      throw new BadRequestException(
        "Kutu adı: 3–50 karakter, küçük harf, rakam ve tire (ör. abayer).",
      );
    }
    return normalized;
  }

  public async ensureOrgInstantBoxDomain(
    organizationId: string,
    orgSlug: string,
  ): Promise<MailDomainEntity> {
    const slug = this.normalizeOrgSlug(orgSlug);
    const domain = this.fqdnForSlug(slug);
    const existingForOrg = await this.domainRepository.findOne({
      where: { organizationId, domainType: "instant_box" },
    });
    if (existingForOrg) {
      if (existingForOrg.domain !== domain) {
        throw new BadRequestException(
          `Bu firma için kutu alanı zaten ${existingForOrg.domain}. Yeni slug kullanılamaz.`,
        );
      }
      return existingForOrg;
    }
    const taken = await this.domainRepository.findOne({ where: { domain } });
    if (taken && taken.organizationId !== organizationId) {
      throw new ConflictException(
        `${slug}.box başka bir firmaya ait. Farklı bir kutu adı seçin.`,
      );
    }
    if (taken) {
      return taken;
    }

    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() ||
      "<VPS_IP>";
    const row = await this.mailDomainApplicationService.createDomain({
      organizationId,
      domain,
      domainType: "instant_box",
      notes: `Lerta Box — ${slug}`,
    });
    row.verificationStatus = "verified";
    row.dnsSnapshot = {
      managedByPlatform: true,
      vanityLabel: formatInstantBoxVanityEmail("info", slug).split("@")[1],
      spfHost: domain,
      spfValue: `v=spf1 ip4:${ipv4} -all`,
      dkimHost: `default._domainkey.${domain}`,
      dmarcHost: `_dmarc.${domain}`,
      dmarcValue: "v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr; pct=100",
      inboundMxHost:
        this.mailDomainDnsVerificationService.resolvePlatformMxHost(),
      wildcardZone: this.resolveZone(),
    };
    return this.domainRepository.save(row);
  }

  public async platformInstantBoxDnsReady(): Promise<boolean> {
    const zone = this.resolveZone();
    const mxHost = this.mailDomainDnsVerificationService.resolvePlatformMxHost();
    const mx = await this.mailDomainDnsVerificationService.verifyMxRecord(
      zone,
      mxHost,
    );
    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() || "";
    const spf = ipv4
      ? await this.mailDomainDnsVerificationService.verifyTxtRecord(
          zone,
          "v=spf1",
          `v=spf1 ip4:${ipv4} -all`,
        )
      : { ok: false, detail: "MAIL_PLATFORM_SPF_IPV4 tanımlı değil" };
    return mx.ok && spf.ok;
  }

  public async provisionSender(params: {
    organizationId: string;
    orgSlug: string;
    localPart: string;
    displayName?: string;
    makeDefault?: boolean;
  }): Promise<{
    fromAddress: string;
    vanityAddress: string;
    sender: MailSenderIdentityEntity;
    mailDomain: MailDomainEntity;
  }> {
    const slug = this.normalizeOrgSlug(params.orgSlug);
    const mailDomain = await this.ensureOrgInstantBoxDomain(
      params.organizationId,
      slug,
    );
    const localPart = params.localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(localPart)) {
      throw new BadRequestException("Geçersiz e-posta ön eki.");
    }
    const taken = await this.senderRepository.findOne({
      where: { mailDomainId: mailDomain.id, localPart },
    });
    if (taken && taken.organizationId !== params.organizationId) {
      throw new BadRequestException("Bu adres başka bir firmaya ait.");
    }
    if (taken) {
      return {
        fromAddress: `${localPart}@${mailDomain.domain}`,
        vanityAddress: formatInstantBoxVanityEmail(localPart, slug),
        sender: taken,
        mailDomain,
      };
    }
    await this.mailSaasSubscriptionService.assertMailboxQuota(
      params.organizationId,
      1,
    );
    const sender = await this.mailDomainApplicationService.addSenderIdentity({
      mailDomainId: mailDomain.id,
      organizationId: params.organizationId,
      localPart,
      displayName: params.displayName,
      isDefault: params.makeDefault ?? true,
    });
    return {
      fromAddress: `${localPart}@${mailDomain.domain}`,
      vanityAddress: formatInstantBoxVanityEmail(localPart, slug),
      sender,
      mailDomain,
    };
  }

  public async getOrganizationInstantBox(
    organizationId: string,
  ): Promise<MailDomainEntity | null> {
    return this.domainRepository.findOne({
      where: { organizationId, domainType: "instant_box" },
    });
  }

  public assertNotCustomDomainConfusion(domain: string): void {
    if (isInstantBoxMailDomain(domain)) {
      throw new BadRequestException(
        "Box adresleri otomatik yönetilir; info@firmaniz.box yazarak Hazırla kullanın.",
      );
    }
  }
}
