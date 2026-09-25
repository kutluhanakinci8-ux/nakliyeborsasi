import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { In, Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import {
  extractPlainBodyFromMime,
  normalizeEmailAddress,
  parseMinimalMimeHeaders,
} from "./MailInboundMimeParse";

export type InboundIngestInput = {
  recipient: string;
  sender?: string;
  subject?: string;
  text?: string;
  rawMime?: string;
};

@Injectable()
export class MailInboundIngestService {
  private readonly logger = new Logger(MailInboundIngestService.name);

  public constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
  ) {}

  public async ingest(input: InboundIngestInput): Promise<MailInboundMessageEntity> {
    const recipient = normalizeEmailAddress(input.recipient);
    if (!recipient.includes("@")) {
      throw new BadRequestException("recipient geçersiz");
    }

    let fromAddress = input.sender
      ? normalizeEmailAddress(input.sender)
      : "unknown@inbound.local";
    let subject = input.subject?.trim() ?? "(konu yok)";
    let snippet =
      input.text?.replace(/\s+/g, " ").trim().slice(0, 500) ?? null;
    let bodyText =
      input.text?.trim().slice(0, 200_000) ?? null;
    let rawMime = input.rawMime ?? null;

    if (rawMime) {
      const parsed = parseMinimalMimeHeaders(rawMime);
      if (parsed.fromAddress) {
        fromAddress = normalizeEmailAddress(parsed.fromAddress);
      }
      if (parsed.subject) {
        subject = parsed.subject.slice(0, 500);
      }
      if (!snippet && parsed.textSnippet) {
        snippet = parsed.textSnippet;
      }
      if (!bodyText) {
        bodyText = extractPlainBodyFromMime(rawMime);
      }
    }

    const mailbox = await this.resolveMailbox(recipient);
    const messageId = randomUUID();
    let rawMimePath: string | null = null;
    if (rawMime) {
      rawMimePath = this.persistRawMime(messageId, rawMime);
    }

    const row = await this.inboundRepository.save(
      this.inboundRepository.create({
        id: messageId,
        mailboxId: mailbox.id,
        fromAddress,
        subject,
        snippet,
        bodyText,
        rawMimePath,
        readAt: null,
      }),
    );
    this.logger.log(
      `Inbound stored ${row.id} → ${recipient} (mailbox ${mailbox.id})`,
    );
    return row;
  }

  public async listRecentForAdmin(limit = 80): Promise<
    {
      id: string;
      mailboxId: string;
      emailAddress: string;
      organizationId: string;
      fromAddress: string;
      subject: string;
      snippet: string | null;
      receivedAt: string;
      readAt: string | null;
    }[]
  > {
    const rows = await this.inboundRepository.find({
      order: { receivedAt: "DESC" },
      take: limit,
    });
    const mailboxIds = [...new Set(rows.map((r) => r.mailboxId))];
    const mailboxes = mailboxIds.length
      ? await this.mailboxRepository.find({
          where: { id: In(mailboxIds) },
        })
      : [];
    const mailboxById = new Map(mailboxes.map((m) => [m.id, m]));
    return rows.map((row) => {
      const mailbox = mailboxById.get(row.mailboxId);
      return {
        id: row.id,
        mailboxId: row.mailboxId,
        emailAddress: mailbox?.emailAddress ?? "—",
        organizationId: mailbox?.organizationId ?? "—",
        fromAddress: row.fromAddress,
        subject: row.subject,
        snippet: row.snippet,
        receivedAt: row.receivedAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
      };
    });
  }

  private async resolveMailbox(recipient: string): Promise<MailMailboxEntity> {
    const existing = await this.mailboxRepository.findOne({
      where: { emailAddress: recipient },
    });
    if (existing) {
      return existing;
    }

    const at = recipient.lastIndexOf("@");
    if (at < 1) {
      throw new BadRequestException("recipient geçersiz");
    }
    const localPart = recipient.slice(0, at);
    const domainName = recipient.slice(at + 1);

    const domain = await this.domainRepository.findOne({
      where: { domain: domainName, verificationStatus: "verified" },
    });
    if (!domain?.organizationId) {
      throw new NotFoundException(
        `Alıcı tanınmıyor — doğrulanmış domain veya mailbox gerekli: ${recipient}`,
      );
    }

    const sender = await this.senderRepository.findOne({
      where: {
        organizationId: domain.organizationId,
        mailDomainId: domain.id,
        localPart,
      },
    });
    if (!sender) {
      throw new NotFoundException(
        `Gönderen kimliği olmayan adrese inbound kabul edilmez (spike): ${recipient}`,
      );
    }

    return this.mailboxRepository.save(
      this.mailboxRepository.create({
        organizationId: domain.organizationId,
        emailAddress: recipient,
        status: "active",
        quotaBytes: "0",
      }),
    );
  }

  private persistRawMime(messageId: string, rawMime: string): string {
    const base =
      this.configService.get<string>("MAIL_INBOUND_STORAGE_DIR")?.trim() ||
      join(process.cwd(), "data", "inbound");
    mkdirSync(base, { recursive: true });
    const path = join(base, `${messageId}.eml`);
    writeFileSync(path, rawMime, { encoding: "utf8" });
    return path;
  }
}
