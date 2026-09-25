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
  extractAttachmentsFromMime,
  extractHtmlBodyFromMime,
  extractPlainBodyFromMime,
  normalizeEmailAddress,
  parseInReplyTo,
  parseInternetMessageId,
  parseMinimalMimeHeaders,
} from "./MailInboundMimeParse";
import { MailInboundSpamService } from "./MailInboundSpamService";
import { sanitizeInboundHtml } from "./MailHtmlSanitize";
import { MailImapMaildirService } from "./MailImapMaildirService";
import { MailOrganizationStorageService } from "./MailOrganizationStorageService";
import { MailOrganizationWebhookDispatcherService } from "./MailOrganizationWebhookDispatcherService";
import { MailAddressAliasService } from "./MailAddressAliasService";
import { MailWebPushService } from "./MailWebPushService";
import { MailInboxRuleService } from "./MailInboxRuleService";
import type { MailInboundAttachmentMeta } from "../../infrastructure/database/entities/MailInboundMessageEntity";

export type InboundIngestInput = {
  recipient: string;
  sender?: string;
  subject?: string;
  text?: string;
  rawMime?: string;
  rspamdScore?: number;
  rspamdAction?: string;
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
    private readonly mailInboundSpamService: MailInboundSpamService,
    private readonly mailImapMaildirService: MailImapMaildirService,
    private readonly mailOrganizationStorageService: MailOrganizationStorageService,
    private readonly mailOrganizationWebhookDispatcherService: MailOrganizationWebhookDispatcherService,
    private readonly mailAddressAliasService: MailAddressAliasService,
    private readonly mailWebPushService: MailWebPushService,
    private readonly mailInboxRuleService: MailInboxRuleService,
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
    let bodyHtml: string | null = null;
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
      const htmlRaw = extractHtmlBodyFromMime(rawMime);
      if (htmlRaw) {
        bodyHtml = sanitizeInboundHtml(htmlRaw);
      }
    }

    const aliasMailboxes =
      await this.mailAddressAliasService.resolveMailboxesForRecipient(
        recipient,
      );
    const mailboxes =
      aliasMailboxes ?? [await this.resolveMailbox(recipient)];
    let first: MailInboundMessageEntity | null = null;
    for (const mailbox of mailboxes) {
      const row = await this.storeInboundForMailbox({
        mailbox,
        recipient,
        fromAddress,
        subject,
        snippet,
        bodyText,
        bodyHtml,
        rawMime,
        rspamdScore: input.rspamdScore,
        rspamdAction: input.rspamdAction,
      });
      if (!first) {
        first = row;
      }
    }
    return first!;
  }

  private async storeInboundForMailbox(params: {
    mailbox: MailMailboxEntity;
    recipient: string;
    fromAddress: string;
    subject: string;
    snippet: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    rawMime: string | null;
    rspamdScore?: number;
    rspamdAction?: string;
  }): Promise<MailInboundMessageEntity> {
    const messageId = randomUUID();
    let rawMimePath: string | null = null;
    const rawMime = params.rawMime;
    if (rawMime) {
      rawMimePath = this.persistRawMime(messageId, rawMime);
    }
    const verdict = await this.mailInboundSpamService.evaluate({
      fromAddress: params.fromAddress,
      subject: params.subject,
      bodyText: params.bodyText,
      organizationId: params.mailbox.organizationId,
      rspamdScore: params.rspamdScore,
      rspamdAction: params.rspamdAction,
    });
    const internetMessageId = rawMime ? parseInternetMessageId(rawMime) : null;
    const inReplyTo = rawMime ? parseInReplyTo(rawMime) : null;
    const attachments =
      rawMime && rawMime.length > 0
        ? this.persistAttachments(
            messageId,
            extractAttachmentsFromMime(rawMime),
          )
        : null;

    const inboundBytes =
      (params.bodyText?.length ?? 0) +
      (params.bodyHtml?.length ?? 0) +
      (rawMime?.length ?? 0) +
      (attachments?.reduce((sum, file) => sum + file.sizeBytes, 0) ?? 0);
    await this.mailOrganizationStorageService.assertCanStore(
      params.mailbox.organizationId,
      inboundBytes,
    );

    let maildirFilePath: string | null = null;
    if (rawMime) {
      maildirFilePath = this.mailImapMaildirService.deliverToMaildir({
        recipient: params.mailbox.emailAddress,
        rawMime,
        messageId,
      });
    }
    const row = await this.inboundRepository.save(
      this.inboundRepository.create({
        id: messageId,
        mailboxId: params.mailbox.id,
        fromAddress: params.fromAddress,
        subject: params.subject,
        snippet: params.snippet,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        rawMimePath,
        rspamdScore: params.rspamdScore ?? null,
        rspamdAction: params.rspamdAction ?? null,
        spamStatus: verdict.spamStatus,
        spamReason: verdict.spamReason,
        internetMessageId,
        inReplyTo,
        attachments,
        readAt: null,
        mailboxFolder: "inbox",
        maildirFilePath,
      }),
    );
    const afterRules = await this.mailInboxRuleService.applyToMessage(
      params.mailbox.organizationId,
      row,
    );
    this.logger.log(
      `Inbound stored ${afterRules.id} → ${params.recipient} (mailbox ${params.mailbox.id})`,
    );
    this.mailOrganizationWebhookDispatcherService.dispatch(
      params.mailbox.organizationId,
      "inbound.received",
      {
        messageId: afterRules.id,
        mailboxId: params.mailbox.id,
        recipient: params.recipient,
        deliveredTo: params.mailbox.emailAddress,
        fromAddress: afterRules.fromAddress,
        subject: afterRules.subject,
        receivedAt: afterRules.receivedAt.toISOString(),
        spamStatus: afterRules.spamStatus,
      },
    );
    if (
      afterRules.spamStatus !== "blocked" &&
      afterRules.mailboxFolder === "inbox"
    ) {
      void this.mailWebPushService.notifyNewInbound({
        organizationId: params.mailbox.organizationId,
        messageId: afterRules.id,
        fromAddress: afterRules.fromAddress,
        subject: afterRules.subject,
      });
    }
    return afterRules;
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
      spamStatus: string;
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
        spamStatus: row.spamStatus,
      };
    });
  }

  private persistAttachments(
    messageId: string,
    parsed: ReturnType<typeof extractAttachmentsFromMime>,
  ): MailInboundAttachmentMeta[] {
    if (parsed.length === 0) {
      return [];
    }
    const base =
      this.configService.get<string>("MAIL_INBOUND_STORAGE_DIR")?.trim() ||
      join(process.cwd(), "data", "inbound");
    const dir = join(base, "attachments", messageId);
    mkdirSync(dir, { recursive: true });
    const max = 5;
    return parsed.slice(0, max).map((file, index) => {
      const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = join(dir, `${index}-${safeName}`);
      writeFileSync(path, file.content);
      return {
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.content.length,
        storagePath: path,
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
    if (!domain) {
      throw new NotFoundException(
        `Alıcı tanınmıyor — doğrulanmış domain veya mailbox gerekli: ${recipient}`,
      );
    }

    const sender = await this.senderRepository.findOne({
      where: {
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
        organizationId: sender.organizationId,
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
