import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { SmtpEmailSender } from "./SmtpEmailSender";
import { MailOrganizationSendRateService } from "./MailOrganizationSendRateService";
import { resolveTenantReplyToAddress } from "./MailTenantEmailBranding";

export type ComposeAttachmentInput = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

@Injectable()
export class MailMailboxComposeService {
  private static readonly maxAttachments = 3;
  private static readonly maxAttachmentBytes = 2 * 1024 * 1024;

  public constructor(
    private readonly smtpEmailSender: SmtpEmailSender,
    private readonly mailOrganizationSendRateService: MailOrganizationSendRateService,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
  ) {}

  public async compose(params: {
    organizationId: string;
    to: string;
    subject: string;
    text: string;
    attachments?: ComposeAttachmentInput[];
  }): Promise<{ sentId: string; smtpMessageId: string | null }> {
    const { fromHeader, fromEmail, mailbox } =
      await this.resolveSenderMailbox(params.organizationId);
    this.assertRateLimit(params.organizationId);
    const nodemailerAttachments = this.parseAttachments(params.attachments);
    const replyTo = resolveTenantReplyToAddress();
    const smtpMessageId = await this.smtpEmailSender.send({
      from: fromHeader,
      to: params.to.trim(),
      subject: params.subject.trim(),
      text: params.text,
      html: `<pre>${escapeHtml(params.text)}</pre>`,
      replyTo,
      attachments: nodemailerAttachments,
    });
    this.mailOrganizationSendRateService.recordSend(params.organizationId);
    const sent = await this.sentRepository.save(
      this.sentRepository.create({
        organizationId: params.organizationId,
        mailboxId: mailbox.id,
        fromAddress: fromEmail,
        toAddress: params.to.trim().toLowerCase(),
        subject: params.subject.trim(),
        bodyText: params.text,
        relatedInboundMessageId: null,
        smtpMessageId,
      }),
    );
    return { sentId: sent.id, smtpMessageId };
  }

  public async reply(params: {
    organizationId: string;
    inboundMessageId: string;
    text: string;
    attachments?: ComposeAttachmentInput[];
  }): Promise<{ sentId: string; smtpMessageId: string | null }> {
    const inbound = await this.inboundRepository.findOne({
      where: { id: params.inboundMessageId },
    });
    if (!inbound) {
      throw new NotFoundException("Mesaj bulunamadı");
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: inbound.mailboxId },
    });
    if (!mailbox || mailbox.organizationId !== params.organizationId) {
      throw new ForbiddenException("Bu mesaja yanıt verilemez");
    }
    const subject = inbound.subject.toLowerCase().startsWith("re:")
      ? inbound.subject
      : `Re: ${inbound.subject}`;
    const { fromHeader, fromEmail } = await this.resolveSenderMailbox(
      params.organizationId,
    );
    this.assertRateLimit(params.organizationId);
    const nodemailerAttachments = this.parseAttachments(params.attachments);
    const replyTo = resolveTenantReplyToAddress();
    const inReplyTo = inbound.internetMessageId
      ? `<${inbound.internetMessageId}>`
      : undefined;
    const smtpMessageId = await this.smtpEmailSender.send({
      from: fromHeader,
      to: inbound.fromAddress,
      subject,
      text: params.text,
      html: `<pre>${escapeHtml(params.text)}</pre>`,
      replyTo,
      inReplyTo,
      references: inReplyTo,
      attachments: nodemailerAttachments,
    });
    this.mailOrganizationSendRateService.recordSend(params.organizationId);
    const sent = await this.sentRepository.save(
      this.sentRepository.create({
        organizationId: params.organizationId,
        mailboxId: mailbox.id,
        fromAddress: fromEmail,
        toAddress: inbound.fromAddress,
        subject,
        bodyText: params.text,
        relatedInboundMessageId: inbound.id,
        smtpMessageId,
      }),
    );
    return { sentId: sent.id, smtpMessageId };
  }

  public async listSent(organizationId: string, limit = 40) {
    const rows = await this.sentRepository.find({
      where: { organizationId },
      order: { sentAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      toAddress: row.toAddress,
      subject: row.subject,
      sentAt: row.sentAt.toISOString(),
      relatedInboundMessageId: row.relatedInboundMessageId,
    }));
  }

  private async resolveSenderMailbox(organizationId: string) {
    const identity = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!identity?.mailDomain || identity.mailDomain.verificationStatus !== "verified") {
      throw new BadRequestException(
        "Doğrulanmış kurumsal gönderen kimliği gerekli.",
      );
    }
    const fromEmail =
      `${identity.localPart}@${identity.mailDomain.domain}`.toLowerCase();
    const fromHeader = identity.displayName?.trim()
      ? `${identity.displayName.trim()} <${fromEmail}>`
      : fromEmail;
    let mailbox = await this.mailboxRepository.findOne({
      where: { organizationId, emailAddress: fromEmail },
    });
    if (!mailbox) {
      mailbox = await this.mailboxRepository.save(
        this.mailboxRepository.create({
          organizationId,
          emailAddress: fromEmail,
          status: "active",
          quotaBytes: "0",
        }),
      );
    }
    return { fromHeader, fromEmail, mailbox };
  }

  private assertRateLimit(organizationId: string): void {
    try {
      this.mailOrganizationSendRateService.assertCanSend(organizationId);
    } catch {
      throw new BadRequestException(
        "Kurumsal gönderim saatlik limiti aşıldı — daha sonra deneyin.",
      );
    }
  }

  private parseAttachments(
    attachments?: ComposeAttachmentInput[],
  ): { filename: string; content: Buffer; contentType: string }[] {
    if (!attachments?.length) {
      return [];
    }
    if (attachments.length > MailMailboxComposeService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MailMailboxComposeService.maxAttachments} ek.`,
      );
    }
    return attachments.map((item) => {
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length > MailMailboxComposeService.maxAttachmentBytes) {
        throw new BadRequestException(
          `Ek çok büyük: ${item.filename} (max 2MB)`,
        );
      }
      return {
        filename: item.filename.slice(0, 120),
        content,
        contentType: item.contentType || "application/octet-stream",
      };
    });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
