import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { In, Repository } from "typeorm";
import { PLATFORM_TENANT_MAIL_DOMAIN } from "@nakliyeborsasi/core";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";

export type InboundRoutingEntry = {
  emailAddress: string;
  virtualAliasLine: string;
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
    for (const sender of senders) {
      if (!verifiedIds.has(sender.mailDomainId) || !sender.mailDomain) {
        continue;
      }
      const emailAddress =
        `${sender.localPart}@${sender.mailDomain.domain}`.toLowerCase();
      entries.push({
        emailAddress,
        organizationId: sender.organizationId,
        domain: sender.mailDomain.domain,
        virtualAliasLine: `${emailAddress}\t"|${pipeScript} ${emailAddress}"`,
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
    const snapshot = await this.buildRoutingSnapshot();
    const body = `${snapshot.entries.map((e) => e.virtualAliasLine).join("\n")}\n`;
    if (!apply) {
      return {
        written: false,
        path,
        entryCount: snapshot.entries.length,
        detail:
          "MAIL_INBOUND_APPLY_POSTFIX=true değil — yalnızca önizleme (dosya yazılmadı).",
      };
    }
    writeFileSync(path, body, { encoding: "utf8" });
    try {
      execFileSync("postmap", [path], { stdio: "pipe" });
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
      detail: "Postfix virtual_alias_maps güncellendi.",
    };
  }

  private resolvePipeScript(): string {
    return (
      this.configService.get<string>("MAIL_INBOUND_PIPE_SCRIPT")?.trim() ||
      "/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh"
    );
  }
}
