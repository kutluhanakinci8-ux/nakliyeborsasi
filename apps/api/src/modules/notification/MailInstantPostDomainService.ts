import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  PLATFORM_MAIL_INSTANT_POST_ZONE,
  formatInstantPostVanityEmail,
  isInstantPostMailDomain,
} from "@nakliyeborsasi/core";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailImapCredentialEntity } from "../../infrastructure/database/entities/MailImapCredentialEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { MailImapAccessService } from "./MailImapAccessService";
import { MailImapMaildirService } from "./MailImapMaildirService";
import { MailInboundRoutingService } from "./MailInboundRoutingService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

const INSTANT_POST_DOMAIN_TYPES = ["instant_post", "instant_box"] as const;

@Injectable()
export class MailInstantPostDomainService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailImapCredentialEntity)
    private readonly imapCredentialRepository: Repository<MailImapCredentialEntity>,
    private readonly mailImapMaildirService: MailImapMaildirService,
    private readonly mailImapAccessService: MailImapAccessService,
    private readonly mailInboundRoutingService: MailInboundRoutingService,
  ) {}

  public resolveZone(): string {
    return (
      this.configService
        .get<string>("MAIL_PLATFORM_INSTANT_POST_ZONE")
        ?.trim() || PLATFORM_MAIL_INSTANT_POST_ZONE
    );
  }

  public fqdnForSlug(orgSlug: string): string {
    const slug = this.normalizeOrgSlug(orgSlug);
    return `${slug}.${this.resolveZone()}`;
  }

  public normalizeOrgSlug(slug: string): string {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(normalized)) {
      throw new BadRequestException(
        "Firma posta adı: 3–50 karakter, küçük harf, rakam ve tire (ör. abayer).",
      );
    }
    return normalized;
  }

  public async ensureOrgPostDomain(
    organizationId: string,
    orgSlug: string,
  ): Promise<MailDomainEntity> {
    const slug = this.normalizeOrgSlug(orgSlug);
    const domain = this.fqdnForSlug(slug);
    const existingForOrg = await this.domainRepository.findOne({
      where: {
        organizationId,
        domainType: In([...INSTANT_POST_DOMAIN_TYPES]),
      },
    });
    if (existingForOrg) {
      if (existingForOrg.domain !== domain) {
        throw new BadRequestException(
          `Bu firma için posta alanı zaten ${existingForOrg.domain}. Slug değiştirilemez.`,
        );
      }
      if (existingForOrg.domainType === "instant_box") {
        existingForOrg.domainType = "instant_post";
        await this.domainRepository.save(existingForOrg);
      }
      return existingForOrg;
    }
    const taken = await this.domainRepository.findOne({ where: { domain } });
    if (taken && taken.organizationId !== organizationId) {
      throw new ConflictException(
        `${slug}.post başka bir firmaya ait. Farklı bir firma adı seçin.`,
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
      domainType: "instant_post",
      notes: `Lerta Post — ${slug}`,
    });
    row.verificationStatus = "verified";
    row.dnsSnapshot = {
      managedByPlatform: true,
      product: "lerta_post",
      vanitySuffix: `.${slug}.post`,
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

  public async platformPostDnsReady(): Promise<boolean> {
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

  public async provisionMailbox(params: {
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
    const mailDomain = await this.ensureOrgPostDomain(
      params.organizationId,
      slug,
    );
    const localPart = params.localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(localPart)) {
      throw new BadRequestException("Geçersiz e-posta ön eki (info, satis, …).");
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
        vanityAddress: formatInstantPostVanityEmail(localPart, slug),
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
      vanityAddress: formatInstantPostVanityEmail(localPart, slug),
      sender,
      mailDomain,
    };
  }

  public assertNotCustomDomainConfusion(domain: string): void {
    if (isInstantPostMailDomain(domain)) {
      throw new BadRequestException(
        "Lerta Post adresleri otomatik yönetilir; info@firmaniz.post yazarak Hazırla kullanın.",
      );
    }
  }

  /**
   * Mevcut varsayılan kutuyu (ör. info@abayer.com) Lerta Post'a taşır.
   * Maildir ve IMAP kullanıcı adı teknik FQDN'e güncellenir; UI vanity gösterir.
   */
  public async switchOrganizationPrimaryToPost(params: {
    organizationId: string;
    orgSlug: string;
    localPart: string;
    displayName?: string;
  }): Promise<{
    fromAddress: string;
    vanityAddress: string;
    previousFromAddress: string | null;
    maildirRenamed: boolean;
  }> {
    const previousSender = await this.senderRepository.findOne({
      where: { organizationId: params.organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    const previousFromAddress = previousSender?.mailDomain
      ? `${previousSender.localPart}@${previousSender.mailDomain.domain}`.toLowerCase()
      : null;

    const post = await this.provisionMailbox({
      organizationId: params.organizationId,
      orgSlug: params.orgSlug,
      localPart: params.localPart,
      displayName: params.displayName,
      makeDefault: true,
    });
    const newFromAddress = post.fromAddress.toLowerCase();

    if (previousFromAddress && previousFromAddress !== newFromAddress) {
      await this.repointMailboxRow(
        params.organizationId,
        previousFromAddress,
        newFromAddress,
      );
      const cred = await this.imapCredentialRepository.findOne({
        where: { organizationId: params.organizationId },
      });
      if (cred && cred.emailAddress.toLowerCase() === previousFromAddress) {
        cred.emailAddress = newFromAddress;
        await this.imapCredentialRepository.save(cred);
        void this.mailImapAccessService.syncDovecotPasswdFile().catch(() => {
          /* best-effort */
        });
      }
    }

    const maildirRenamed = previousFromAddress
      ? this.mailImapMaildirService.renameMailboxHomedir(
          previousFromAddress,
          newFromAddress,
        )
      : false;

    void this.mailInboundRoutingService.writePostfixVirtualMap().catch(() => {
      /* best-effort */
    });

    return {
      fromAddress: post.fromAddress,
      vanityAddress: post.vanityAddress,
      previousFromAddress,
      maildirRenamed,
    };
  }

  private async repointMailboxRow(
    organizationId: string,
    oldEmail: string,
    newEmail: string,
  ): Promise<void> {
    const oldRow = await this.mailboxRepository.findOne({
      where: { organizationId, emailAddress: oldEmail },
    });
    const newRow = await this.mailboxRepository.findOne({
      where: { organizationId, emailAddress: newEmail },
    });
    if (oldRow && newRow && oldRow.id !== newRow.id) {
      await this.mailboxRepository.remove(newRow);
      oldRow.emailAddress = newEmail;
      await this.mailboxRepository.save(oldRow);
      return;
    }
    if (oldRow) {
      oldRow.emailAddress = newEmail;
      await this.mailboxRepository.save(oldRow);
    }
  }
}
