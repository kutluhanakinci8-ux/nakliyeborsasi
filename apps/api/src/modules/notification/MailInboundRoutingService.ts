import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { In, Repository } from "typeorm";
import { PLATFORM_TENANT_MAIL_DOMAIN } from "@nakliyeborsasi/core";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailAddressAliasService } from "./MailAddressAliasService";

export type InboundRoutingEntry = {
  emailAddress: string;
  virtualAliasLine: string;
  localAliasLine: string;
  organizationId: string;
  domain: string;
};

@Injectable()
export class MailInboundRoutingService {
  private readonly logger = new Logger(MailInboundRoutingService.name);

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    private readonly mailAddressAliasService: MailAddressAliasService,
  ) {}

  public resolveInboundDomains(): string[] {
    const raw =
      this.configService.get<string>("MAIL_INBOUND_VIRTUAL_DOMAINS")?.trim() ||
      this.configService
        .get<string>("MAIL_PLATFORM_TENANT_DOMAIN")
        ?.trim() ||
      PLATFORM_TENANT_MAIL_DOMAIN;
    return raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Postfix virtual → local stub (pipe /etc/aliases üzerinden). */
  public inboundLocalStub(emailAddress: string): string {
    const slug = emailAddress
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    return `lerta-inbound-${slug || "addr"}`;
  }

  public async buildRoutingSnapshot(): Promise<{
    inboundDomains: string[];
    entries: InboundRoutingEntry[];
    pipeScript: string;
  }> {
    const inboundDomains = this.resolveInboundDomains();
    const domains =
      inboundDomains.length === 0
        ? []
        : await this.domainRepository.find({
            where: {
              domain: In(inboundDomains),
              verificationStatus: "verified",
            },
          });
    const verifiedIds = new Set(domains.map((d) => d.id));
    const senders = await this.senderRepository.find({
      relations: { mailDomain: true },
    });
    const pipeScript = this.resolvePipeScript();
    const entries: InboundRoutingEntry[] = [];
    const seen = new Set<string>();
    for (const sender of senders) {
      if (!verifiedIds.has(sender.mailDomainId) || !sender.mailDomain) {
        continue;
      }
      const emailAddress =
        `${sender.localPart}@${sender.mailDomain.domain}`.toLowerCase();
      if (seen.has(emailAddress)) {
        continue;
      }
      seen.add(emailAddress);
      const stub = this.inboundLocalStub(emailAddress);
      entries.push({
        emailAddress,
        organizationId: sender.organizationId,
        domain: sender.mailDomain.domain,
        virtualAliasLine: `${emailAddress}\t${stub}`,
        localAliasLine: `${stub}: "|${pipeScript} ${emailAddress}"`,
      });
    }
    const aliasRows =
      await this.mailAddressAliasService.listAliasEmailsForRouting();
    for (const alias of aliasRows) {
      if (!inboundDomains.includes(alias.domain.toLowerCase())) {
        continue;
      }
      if (seen.has(alias.aliasEmail)) {
        continue;
      }
      seen.add(alias.aliasEmail);
      const stub = this.inboundLocalStub(alias.aliasEmail);
      entries.push({
        emailAddress: alias.aliasEmail,
        organizationId: alias.organizationId,
        domain: alias.domain,
        virtualAliasLine: `${alias.aliasEmail}\t${stub}`,
        localAliasLine: `${stub}: "|${pipeScript} ${alias.aliasEmail}"`,
      });
    }
    entries.sort((a, b) => a.emailAddress.localeCompare(b.emailAddress));
    return { inboundDomains, entries, pipeScript };
  }

  public async writePostfixVirtualMap(): Promise<{
    written: boolean;
    path: string | null;
    entryCount: number;
    detail: string;
  }> {
    const apply =
      this.configService.get<string>("MAIL_INBOUND_APPLY_POSTFIX") === "true";
    const path =
      this.configService.get<string>("MAIL_INBOUND_POSTFIX_VIRTUAL_PATH")?.trim() ||
      "/etc/postfix/lerta-inbound-virtual";
    const aliasesPath =
      this.configService
        .get<string>("MAIL_INBOUND_POSTFIX_ALIASES_PATH")
        ?.trim() || "/etc/postfix/lerta-inbound-aliases";
    const snapshot = await this.buildRoutingSnapshot();
    const virtualBody = `${snapshot.entries.map((e) => e.virtualAliasLine).join("\n")}\n`;
    const aliasesBody = `${snapshot.entries.map((e) => e.localAliasLine).join("\n")}\n`;
    if (!apply) {
      return {
        written: false,
        path,
        entryCount: snapshot.entries.length,
        detail:
          "MAIL_INBOUND_APPLY_POSTFIX=true değil — yalnızca önizleme (dosya yazılmadı).",
      };
    }
    writeFileSync(path, virtualBody, { encoding: "utf8" });
    writeFileSync(aliasesPath, aliasesBody, { encoding: "utf8" });
    try {
      execFileSync("postmap", [path], { stdio: "pipe" });
      execFileSync("postalias", [aliasesPath], { stdio: "pipe" });
      execFileSync("systemctl", ["reload", "postfix"], { stdio: "pipe" });
    } catch (error) {
      this.logger.warn(`postmap/postfix reload: ${String(error)}`);
      return {
        written: true,
        path,
        entryCount: snapshot.entries.length,
        detail: "Dosya yazıldı; postmap/reload manuel kontrol edin.",
      };
    }
    return {
      written: true,
      path,
      entryCount: snapshot.entries.length,
      detail:
        "Postfix virtual_alias_maps + lerta-inbound-aliases güncellendi (pipe → API).",
    };
  }

  private resolvePipeScript(): string {
    return (
      this.configService.get<string>("MAIL_INBOUND_PIPE_SCRIPT")?.trim() ||
      "/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh"
    );
  }
}
