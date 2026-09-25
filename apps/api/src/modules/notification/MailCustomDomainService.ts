import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainApplicationService } from "./MailDomainApplicationService";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";
import { PLATFORM_TENANT_MAIL_DOMAIN } from "@nakliyeborsasi/core";
import { MailCustomDomainOpenDkimInstaller } from "./MailCustomDomainOpenDkimInstaller";

export type CustomDomainDnsInstructions = {
  domain: string;
  mxHost: string;
  mxPriority: number;
  spfHost: string;
  spfValue: string;
  dkimHost: string;
  dkimTxt: string;
  dmarcHost: string;
  dmarcValue: string;
  vpsOpendkimScript: string;
};

export type CustomDomainBundle = {
  mailDomain: MailDomainEntity | null;
  dnsInstructions: CustomDomainDnsInstructions | null;
  dnsCheck: {
    ok: boolean;
    mx: { ok: boolean; detail: string };
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  } | null;
  sender: MailSenderIdentityEntity | null;
  fromAddress: string | null;
};

@Injectable()
export class MailCustomDomainService {
  private readonly logger = new Logger(MailCustomDomainService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailDomainApplicationService: MailDomainApplicationService,
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    private readonly mailCustomDomainOpenDkimInstaller: MailCustomDomainOpenDkimInstaller,
  ) {}

  public normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase().replace(/\.$/, "");
  }

  public assertValidCustomDomain(domain: string): void {
    const normalized = this.normalizeDomain(domain);
    if (
      normalized === "lerta.tr" ||
      normalized.endsWith(".lerta.tr") ||
      normalized === PLATFORM_TENANT_MAIL_DOMAIN ||
      normalized.endsWith(`.${PLATFORM_TENANT_MAIL_DOMAIN}`)
    ) {
      throw new BadRequestException(
        "Paylaşımlı platform alanları özel domain olarak eklenemez; kullanici.lerta.tr akışını kullanın.",
      );
    }
    if (
      !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
        normalized,
      )
    ) {
      throw new BadRequestException(
        "Geçerli bir alan adı girin (ör. musteri.com).",
      );
    }
  }

  public async getOrganizationBundle(
    organizationId: string,
  ): Promise<CustomDomainBundle> {
    const [mailDomain] = await this.domainRepository.find({
      where: { organizationId, domainType: "custom" },
      relations: { senderIdentities: true },
      order: { createdAt: "DESC" },
      take: 1,
    });
    if (!mailDomain) {
      return {
        mailDomain: null,
        dnsInstructions: null,
        dnsCheck: null,
        sender: null,
        fromAddress: null,
      };
    }
    const dnsInstructions = this.buildInstructionsFromSnapshot(mailDomain);
    const dnsCheck = await this.verifyDomainDns(mailDomain);
    const sender = await this.senderRepository.findOne({
      where: { organizationId, mailDomainId: mailDomain.id, isDefault: true },
    });
    return {
      mailDomain,
      dnsInstructions,
      dnsCheck,
      sender,
      fromAddress: sender
        ? `${sender.localPart}@${mailDomain.domain}`
        : null,
    };
  }

  public async registerForOrganization(
    organizationId: string,
    domainInput: string,
  ): Promise<CustomDomainBundle> {
    const domain = this.normalizeDomain(domainInput);
    this.assertValidCustomDomain(domain);

    const existingOrg = await this.domainRepository.findOne({
      where: { organizationId, domainType: "custom" },
    });
    if (existingOrg && existingOrg.domain !== domain) {
      throw new ConflictException(
        "Organizasyon için zaten bir özel domain tanımlı. Önce mevcut kaydı kaldırın (destek).",
      );
    }
    const taken = await this.domainRepository.findOne({ where: { domain } });
    if (taken && taken.organizationId !== organizationId) {
      throw new ConflictException(`${domain} başka bir organizasyona bağlı.`);
    }
    if (existingOrg?.domain === domain) {
      return this.getOrganizationBundle(organizationId);
    }

    const dkimMaterial = this.generateDkimMaterial(domain);
    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() ||
      "<VPS_IP>";
    const spfValue = `v=spf1 ip4:${ipv4} -all`;
    const row = await this.mailDomainApplicationService.createDomain({
      organizationId,
      domain,
      domainType: "custom",
      notes: "Faz B5 özel domain",
    });
    row.dnsSnapshot = {
      spfHost: domain,
      spfValue,
      dkimHost: `default._domainkey.${domain}`,
      dkimTxt: dkimMaterial.dkimTxt,
      dkimPrivateKeyPem: dkimMaterial.privateKeyPem,
      dkimSelector: "default",
      vpsScript: `bash scripts/register-opendkim-custom-domain.sh ${domain}`,
    };
    await this.domainRepository.save(row);
    return this.getOrganizationBundle(organizationId);
  }

  public async verifyAndMarkOrganizationDomain(
    organizationId: string,
  ): Promise<MailDomainEntity> {
    const mailDomain = await this.domainRepository.findOne({
      where: { organizationId, domainType: "custom" },
    });
    if (!mailDomain) {
      throw new NotFoundException("Özel domain kaydı bulunamadı.");
    }
    const check = await this.verifyDomainDns(mailDomain);
    if (!check.ok) {
      mailDomain.verificationStatus = "failed";
      mailDomain.dnsSnapshot = {
        ...(mailDomain.dnsSnapshot ?? {}),
        lastCheck: check,
        checkedAt: new Date().toISOString(),
      };
      await this.domainRepository.save(mailDomain);
      throw new BadRequestException({
        message: "DNS henüz hazır değil",
        dnsCheck: check,
      });
    }
    mailDomain.verificationStatus = "verified";
    const privateKeyPem = mailDomain.dnsSnapshot?.dkimPrivateKeyPem as
      | string
      | undefined;
    let opendkimInstall = { installed: false, detail: "—" };
    if (privateKeyPem) {
      opendkimInstall = this.mailCustomDomainOpenDkimInstaller.tryInstall({
        domain: mailDomain.domain,
        selector: (mailDomain.dnsSnapshot?.dkimSelector as string) ?? "default",
        privateKeyPem,
      });
    }
    mailDomain.dnsSnapshot = {
      ...(mailDomain.dnsSnapshot ?? {}),
      lastCheck: check,
      checkedAt: new Date().toISOString(),
      opendkimInstall,
    };
    return this.domainRepository.save(mailDomain);
  }

  public async provisionSender(params: {
    organizationId: string;
    localPart: string;
    displayName?: string;
  }): Promise<{ fromAddress: string; sender: MailSenderIdentityEntity }> {
    const mailDomain = await this.domainRepository.findOne({
      where: { organizationId: params.organizationId, domainType: "custom" },
    });
    if (!mailDomain || mailDomain.verificationStatus !== "verified") {
      throw new BadRequestException(
        "Önce özel domain DNS doğrulamasını tamamlayın.",
      );
    }
    const localPart = params.localPart.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(localPart)) {
      throw new BadRequestException("Geçersiz e-posta ön eki (local-part).");
    }
    await this.senderRepository.update(
      { organizationId: params.organizationId, isDefault: true },
      { isDefault: false },
    );
    const sender = await this.mailDomainApplicationService.addSenderIdentity({
      mailDomainId: mailDomain.id,
      organizationId: params.organizationId,
      localPart,
      displayName: params.displayName,
      isDefault: true,
    });
    return {
      fromAddress: `${localPart}@${mailDomain.domain}`,
      sender,
    };
  }

  public async verifyDomainById(domainId: string): Promise<{
    domain: MailDomainEntity;
    dnsCheck: Awaited<ReturnType<MailCustomDomainService["verifyDomainDns"]>>;
  }> {
    const mailDomain = await this.domainRepository.findOne({
      where: { id: domainId, domainType: "custom" },
    });
    if (!mailDomain) {
      throw new NotFoundException("Custom mail domain not found");
    }
    const check = await this.verifyDomainDns(mailDomain);
    if (check.ok) {
      mailDomain.verificationStatus = "verified";
      const privateKeyPem = mailDomain.dnsSnapshot?.dkimPrivateKeyPem as
        | string
        | undefined;
      if (privateKeyPem) {
        const opendkimInstall =
          this.mailCustomDomainOpenDkimInstaller.tryInstall({
            domain: mailDomain.domain,
            selector:
              (mailDomain.dnsSnapshot?.dkimSelector as string) ?? "default",
            privateKeyPem,
          });
        mailDomain.dnsSnapshot = {
          ...(mailDomain.dnsSnapshot ?? {}),
          opendkimInstall,
        };
      }
    } else {
      mailDomain.verificationStatus = "failed";
    }
    mailDomain.dnsSnapshot = {
      ...(mailDomain.dnsSnapshot ?? {}),
      lastCheck: check,
      checkedAt: new Date().toISOString(),
    };
    await this.domainRepository.save(mailDomain);
    return { domain: mailDomain, dnsCheck: check };
  }

  public assertOrganizationOwnsDomain(
    mailDomain: MailDomainEntity,
    organizationId: string,
  ): void {
    if (mailDomain.organizationId !== organizationId) {
      throw new ForbiddenException("Bu domain bu organizasyona ait değil.");
    }
  }

  private buildInstructionsFromSnapshot(
    mailDomain: MailDomainEntity,
  ): CustomDomainDnsInstructions {
    const snap = mailDomain.dnsSnapshot ?? {};
    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() ||
      "<VPS_IP>";
    const domain = mailDomain.domain;
    const parts = domain.split(".");
    const orgRoot =
      parts.length >= 2 ? parts.slice(-2).join(".") : domain;
    const mxHost = this.mailDomainDnsVerificationService.resolvePlatformMxHost();
    return {
      domain,
      mxHost,
      mxPriority: 10,
      spfHost: (snap.spfHost as string) ?? domain,
      spfValue: (snap.spfValue as string) ?? `v=spf1 ip4:${ipv4} -all`,
      dkimHost:
        (snap.dkimHost as string) ?? `default._domainkey.${domain}`,
      dkimTxt: (snap.dkimTxt as string) ?? "",
      dmarcHost: `_dmarc.${orgRoot}`,
      dmarcValue: "v=DMARC1; p=none; rua=mailto:dmarc@lerta.tr; pct=100",
      vpsOpendkimScript:
        (snap.vpsScript as string) ??
        `bash scripts/register-opendkim-custom-domain.sh ${domain}`,
    };
  }

  private async verifyDomainDns(mailDomain: MailDomainEntity): Promise<{
    ok: boolean;
    mx: { ok: boolean; detail: string };
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  }> {
    const instructions = this.buildInstructionsFromSnapshot(mailDomain);
    const mx = await this.mailDomainDnsVerificationService.verifyMxRecord(
      mailDomain.domain,
      instructions.mxHost,
    );
    const spf = await this.mailDomainDnsVerificationService.verifyTxtRecord(
      instructions.spfHost,
      "v=spf1",
      instructions.spfValue,
    );
    const dkim = instructions.dkimTxt
      ? await this.mailDomainDnsVerificationService.verifyTxtRecord(
          instructions.dkimHost,
          "v=DKIM1",
          instructions.dkimTxt,
        )
      : {
          ok: false,
          detail: "DKIM TXT üretilmedi — domain kaydını yeniden oluşturun.",
        };
    return { ok: mx.ok && spf.ok && dkim.ok, mx, spf, dkim };
  }

  private generateDkimMaterial(domain: string): {
    dkimTxt: string;
    privateKeyPem: string;
  } {
    try {
      const dir = mkdtempSync(join(tmpdir(), "lerta-dkim-"));
      try {
        execFileSync(
          "opendkim-genkey",
          ["-b", "1024", "-d", domain, "-s", "default", "-D", dir],
          { stdio: "pipe" },
        );
        const rawTxt = readFileSync(join(dir, "default.txt"), "utf8");
        const flat = rawTxt.replace(/[\n\r"]/g, "").replace(/\s+/g, " ");
        const dkimMatch = flat.match(/(v=DKIM1;[^;]+;[^;]+; p=[A-Za-z0-9+/=]+)/);
        const txt = dkimMatch?.[1] ?? flat;
        const privateKeyPem = readFileSync(
          join(dir, "default.private"),
          "utf8",
        );
        const dkimTxt = txt.includes("v=DKIM1") ? txt : `v=DKIM1; k=rsa; p=${txt}`;
        return { dkimTxt, privateKeyPem };
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(
        `opendkim-genkey kullanılamadı (${domain}); geçici DKIM üretilemedi.`,
      );
      throw new BadRequestException(
        "DKIM anahtarı üretilemedi. API sunucusunda opendkim-tools kurulu olmalı.",
      );
    }
  }
}
