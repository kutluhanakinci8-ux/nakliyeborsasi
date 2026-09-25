import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { ConfigService } from "@nestjs/config";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

export type TenantSubdomainPilotBundle = {
  domain: string;
  mailDomain: MailDomainEntity | null;
  dnsCheck: Awaited<
    ReturnType<MailDomainDnsVerificationService["verifyTenantSubdomainDns"]>
  >;
  dnsInstructions: {
    spfHost: string;
    spfValue: string;
    dkimHost: string;
    dkimValueHint: string;
    dmarcHost: string;
    dmarcValue: string;
  };
  senders: MailSenderIdentityEntity[];
};

@Injectable()
export class MailTenantSubdomainService {
  public constructor(
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async getPilotBundle(): Promise<TenantSubdomainPilotBundle> {
    const domain = this.mailDomainDnsVerificationService.resolveTenantMailDomain();
    const mailDomain = await this.domainRepository.findOne({
      where: { domain },
      relations: { senderIdentities: true },
    });
    const dnsCheck =
      await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() ||
      "<VPS_IP>";
    const dkimHint =
      this.configService.get<string>("MAIL_PLATFORM_TENANT_DKIM_TXT")?.trim() ||
      this.configService.get<string>("MAIL_PLATFORM_DKIM_TXT")?.trim() ||
      "VPS OpenDKIM default._domainkey.kullanici.lerta.tr";

    return {
      domain,
      mailDomain,
      dnsCheck,
      dnsInstructions: {
        spfHost: domain,
        spfValue: `v=spf1 ip4:${ipv4} -all`,
        dkimHost: `default._domainkey.${domain}`,
        dkimValueHint: dkimHint,
        dmarcHost: `_dmarc.${domain}`,
        dmarcValue:
          this.configService.get<string>("MAIL_PLATFORM_DMARC_TXT")?.trim() ||
          "v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr; pct=100",
      },
      senders: mailDomain?.senderIdentities ?? [],
    };
  }

  public async ensureTenantDomainRow(): Promise<MailDomainEntity> {
    const domain = this.mailDomainDnsVerificationService.resolveTenantMailDomain();
    const existing = await this.domainRepository.findOne({ where: { domain } });
    if (existing) {
      return existing;
    }
    return this.mailDomainApplicationService.createDomain({
      organizationId: null,
      domain,
      domainType: "subdomain",
      notes: "Faz B paylaşımlı tenant alt alanı",
    });
  }

  public async verifyTenantDomainDns(): Promise<MailDomainEntity> {
    const check =
      await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
    if (!check.ok) {
      throw new BadRequestException({
        message: "Tenant DNS henüz hazır değil",
        dnsCheck: check,
      });
    }
    const row = await this.ensureTenantDomainRow();
    row.verificationStatus = "verified";
    return this.domainRepository.save(row);
  }

  public async getOrganizationMailIdentity(organizationId: string): Promise<{
    domain: string;
    platformDnsReady: boolean;
    domainVerified: boolean;
    dnsCheck: Awaited<
      ReturnType<MailDomainDnsVerificationService["verifyTenantSubdomainDns"]>
    >;
    sender: MailSenderIdentityEntity | null;
    fromAddress: string | null;
  }> {
    const domain = this.mailDomainDnsVerificationService.resolveTenantMailDomain();
    const dnsCheck =
      await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
    const mailDomain = await this.domainRepository.findOne({
      where: { domain },
    });
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    const fromAddress =
      sender && mailDomain
        ? `${sender.localPart}@${domain}`
        : sender?.mailDomain
          ? `${sender.localPart}@${sender.mailDomain.domain}`
          : null;
    return {
      domain,
      platformDnsReady: dnsCheck.ok,
      domainVerified: mailDomain?.verificationStatus === "verified",
      dnsCheck,
      sender,
      fromAddress,
    };
  }

  public async updateOrganizationSenderDisplayName(
    organizationId: string,
    displayName: string,
  ): Promise<MailSenderIdentityEntity> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
    });
    if (!sender) {
      throw new BadRequestException(
        "Kurumsal gönderen kimliği henüz tanımlı değil.",
      );
    }
    sender.displayName = displayName.trim().slice(0, 120) || "Kurumsal bildirim";
    return this.senderRepository.save(sender);
  }

  public async syncTenantDomainVerificationFromDns(): Promise<{
    domain: string;
    dnsOk: boolean;
    verificationStatus: string | null;
  }> {
    const check =
      await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
    const domain = check.domain;
    if (!check.ok) {
      const row = await this.domainRepository.findOne({ where: { domain } });
      // Manuel/pilot doğrulama korunur; DNS geçici uyumsuzlukta gönderim kesilmez.
      return {
        domain,
        dnsOk: false,
        verificationStatus: row?.verificationStatus ?? null,
      };
    }
    const row = await this.ensureTenantDomainRow();
    if (row.verificationStatus !== "verified") {
      row.verificationStatus = "verified";
      await this.domainRepository.save(row);
    }
    return { domain, dnsOk: true, verificationStatus: "verified" };
  }

  public async provisionPilotSender(params: {
    organizationId: string;
    localPart: string;
    displayName?: string;
  }): Promise<{
    domain: MailDomainEntity;
    sender: MailSenderIdentityEntity;
    fromAddress: string;
  }> {
    const tenantDomain =
      this.mailDomainDnsVerificationService.resolveTenantMailDomain();
    const domainRow = await this.domainRepository.findOne({
      where: { domain: tenantDomain },
    });
    if (!domainRow || domainRow.verificationStatus !== "verified") {
      throw new BadRequestException(
        "Önce kullanici.lerta.tr DNS doğrulamasını tamamlayın (admin: DNS doğrula).",
      );
    }

    const localPart = params.localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(localPart)) {
      throw new BadRequestException(
        "local-part: 3–50 karakter, küçük harf, rakam ve tire (ör. acme-lojistik).",
      );
    }

    const taken = await this.senderRepository.findOne({
      where: { mailDomainId: domainRow.id, localPart },
    });
    if (taken && taken.organizationId !== params.organizationId) {
      throw new ConflictException(
        `${localPart}@${tenantDomain} başka bir organizasyona ait.`,
      );
    }

    if (!taken) {
      await this.mailSaasSubscriptionService.assertMailboxQuota(
        params.organizationId,
        1,
      );
    }

    const sender = await this.mailDomainApplicationService.addSenderIdentity({
      mailDomainId: domainRow.id,
      organizationId: params.organizationId,
      localPart,
      displayName: params.displayName?.trim() || "Kurumsal bildirim",
      isDefault: true,
    });

    return {
      domain: domainRow,
      sender,
      fromAddress: `${localPart}@${tenantDomain}`,
    };
  }
}
