import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { MailImapCredentialEntity } from "../../infrastructure/database/entities/MailImapCredentialEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailImapMaildirService } from "./MailImapMaildirService";

@Injectable()
export class MailImapAccessService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly mailImapMaildirService: MailImapMaildirService,
    @InjectRepository(MailImapCredentialEntity)
    private readonly credentialRepository: Repository<MailImapCredentialEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async getSettings(organizationId: string): Promise<{
    enabled: boolean;
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: "starttls" | "ssl";
    smtpAuthUsesImapPassword: boolean;
    sentFolderImapHint: string;
    username: string | null;
    maildirPath: string | null;
    hasCredential: boolean;
  }> {
    const email = await this.resolvePrimaryEmail(organizationId);
    const row = await this.credentialRepository.findOne({
      where: { organizationId },
    });
    const imapHost =
      this.configService.get<string>("MAIL_IMAP_HOST")?.trim() ||
      "mail.lerta.tr";
    const smtpHost =
      this.configService.get<string>("MAIL_CLIENT_SMTP_HOST")?.trim() ||
      imapHost;
    const smtpPort = Number(
      this.configService.get<string>("MAIL_CLIENT_SMTP_PORT")?.trim() || "587",
    );
    const securityRaw =
      this.configService.get<string>("MAIL_CLIENT_SMTP_SECURITY")?.trim() ||
      (smtpPort === 465 ? "ssl" : "starttls");
    const smtpSecurity: "starttls" | "ssl" =
      securityRaw.toLowerCase() === "ssl" ? "ssl" : "starttls";
    return {
      enabled: this.mailImapMaildirService.isEnabled(),
      imapHost,
      imapPort: Number(
        this.configService.get<string>("MAIL_IMAP_PORT")?.trim() || "993",
      ),
      imapTls:
        this.configService.get<string>("MAIL_IMAP_TLS")?.trim() !== "false",
      smtpHost,
      smtpPort,
      smtpSecurity,
      smtpAuthUsesImapPassword: true,
      sentFolderImapHint:
        "Gönderilen klasörü öncelikle webmailde; IMAP Sent her ortamda dolu olmayabilir.",
      username: email,
      maildirPath: email
        ? this.mailImapMaildirService.resolveMaildirForAddress(email)
        : null,
      hasCredential: Boolean(row),
    };
  }

  public async rotatePassword(organizationId: string): Promise<{
    username: string;
    password: string;
  }> {
    const email = await this.resolvePrimaryEmail(organizationId);
    if (!email) {
      throw new NotFoundException("Kurumsal posta adresi yok");
    }
    const password = randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await this.credentialRepository.findOne({
      where: { organizationId },
    });
    if (existing) {
      existing.emailAddress = email;
      existing.passwordHash = passwordHash;
      await this.credentialRepository.save(existing);
    } else {
      await this.credentialRepository.save(
        this.credentialRepository.create({
          organizationId,
          emailAddress: email,
          passwordHash,
        }),
      );
    }
    return { username: email, password };
  }

  public async syncDovecotPasswdFile(): Promise<{
    written: boolean;
    path: string;
    users: number;
    detail: string;
  }> {
    const path =
      this.configService.get<string>("MAIL_IMAP_DOVECOT_PASSWD_PATH")?.trim() ||
      "/etc/dovecot/lerta-imap-passwd";
    const apply =
      this.configService.get<string>("MAIL_IMAP_APPLY_DOVECOT") === "true";
    const rows = await this.credentialRepository.find();
    const lines: string[] = [];
    for (const row of rows) {
      lines.push(`${row.emailAddress}:{BLF-CRYPT}${row.passwordHash}`);
    }
    const body = `${lines.join("\n")}\n`;
    if (!apply) {
      return {
        written: false,
        path,
        users: rows.length,
        detail: "MAIL_IMAP_APPLY_DOVECOT=true değil — dosya yazılmadı.",
      };
    }
    mkdirSync(path.split("/").slice(0, -1).join("/") || "/etc/dovecot", {
      recursive: true,
    });
    writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
    try {
      execFileSync("systemctl", ["reload", "dovecot"], { stdio: "ignore" });
    } catch {
      return {
        written: true,
        path,
        users: rows.length,
        detail: "passwd yazıldı; dovecot reload manuel.",
      };
    }
    return {
      written: true,
      path,
      users: rows.length,
      detail: "Dovecot passwd senkronlandı.",
    };
  }

  private async resolvePrimaryEmail(
    organizationId: string,
  ): Promise<string | null> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!sender?.mailDomain) {
      return null;
    }
    return `${sender.localPart}@${sender.mailDomain.domain}`.toLowerCase();
  }
}
