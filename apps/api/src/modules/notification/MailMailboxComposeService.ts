import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { SmtpEmailSender } from "./SmtpEmailSender";
import { MailOrganizationSendRateService } from "./MailOrganizationSendRateService";
import { MailOrganizationStorageService } from "./MailOrganizationStorageService";
import { MailTenantSuspensionService } from "./MailTenantSuspensionService";
import {
  formatMailFromHeader,
  resolveMailSenderAddresses,
  resolveSmtpFromEmailAddress,
} from "@nakliyeborsasi/core";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailOrganizationIdentityService } from "./MailOrganizationIdentityService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailImapMaildirService } from "./MailImapMaildirService";
import { buildOutgoingSentMime } from "./MailSentMimeBuilder";
import { MailSubscriptionLifecycleService } from "./MailSubscriptionLifecycleService";

export type ComposeAttachmentInput = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

@Injectable()
export class MailMailboxComposeService {
  private static readonly maxAttachments = 3;

  public constructor(
    private readonly smtpEmailSender: SmtpEmailSender,
    private readonly mailOrganizationSendRateService: MailOrganizationSendRateService,
    private readonly mailOrganizationStorageService: MailOrganizationStorageService,
    private readonly mailTenantSuspensionService: MailTenantSuspensionService,
    private readonly mailOrganizationIdentityService: MailOrganizationIdentityService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailImapMaildirService: MailImapMaildirService,
    private readonly mailSubscriptionLifecycleService: MailSubscriptionLifecycleService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly mailDomainRepository: Repository<MailDomainEntity>,
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
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: ComposeAttachmentInput[];
  }): Promise<{ sentId: string; smtpMessageId: string | null }> {
    const { fromHeader, fromEmail, envelopeMailFrom, mailbox, technicalEmail } =
      await this.resolveSenderMailbox(params.organizationId);
    await this.assertRateLimit(params.organizationId);
    await this.mailTenantSuspensionService.assertOrganizationCanSend(
      params.organizationId,
    );
    const nodemailerAttachments = await this.parseAttachments(
      params.organizationId,
      params.attachments,
    );
    await this.mailOrganizationStorageService.assertCanStore(
      params.organizationId,
      params.text.length +
        nodemailerAttachments.reduce((sum, file) => sum + file.content.length, 0),
    );
    const replyTo =
      await this.mailOrganizationIdentityService.resolveOutboundReplyTo(
        params.organizationId,
      );
    const smtpMessageId = await this.smtpEmailSender.send({
      from: fromHeader,
      envelopeMailFrom,
      to: normalizeRecipientList(params.to),
      cc: normalizeOptionalRecipients(params.cc),
      bcc: normalizeOptionalRecipients(params.bcc),
      subject: params.subject.trim(),
      text: params.text,
      html: resolveOutboundHtml(params.text, params.html),
      replyTo,
      attachments: nodemailerAttachments,
    });
    if (!smtpMessageId) {
      throw new BadRequestException(
        "E-posta gönderimi kapalı (EMAIL_ENABLED) veya SMTP yanıt vermedi.",
      );
    }
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
    this.mirrorSentToImap({
      technicalEmail,
      fromHeader,
      to: params.to.trim(),
      subject: params.subject.trim(),
      text: params.text,
      smtpMessageId,
    });
    return { sentId: sent.id, smtpMessageId };
  }

  public async reply(params: {
    organizationId: string;
    inboundMessageId: string;
    text: string;
    cc?: string;
    bcc?: string;
    replyAll?: boolean;
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
    const { fromHeader, fromEmail, envelopeMailFrom, technicalEmail } =
      await this.resolveSenderMailbox(params.organizationId);
    await this.assertRateLimit(params.organizationId);
    await this.mailTenantSuspensionService.assertOrganizationCanSend(
      params.organizationId,
    );
    const nodemailerAttachments = await this.parseAttachments(
      params.organizationId,
      params.attachments,
    );
    await this.mailOrganizationStorageService.assertCanStore(
      params.organizationId,
      params.text.length +
        nodemailerAttachments.reduce((sum, file) => sum + file.content.length, 0),
    );
    const replyTo =
      await this.mailOrganizationIdentityService.resolveOutboundReplyTo(
        params.organizationId,
      );
    const inReplyTo = inbound.internetMessageId
      ? `<${inbound.internetMessageId}>`
      : undefined;
    const replyAll = this.resolveReplyAllRecipients(
      inbound,
      technicalEmail,
      params.replyAll,
      params.cc,
    );
    const smtpMessageId = await this.smtpEmailSender.send({
      from: fromHeader,
      envelopeMailFrom,
      to: replyAll.to,
      cc: normalizeOptionalRecipients(replyAll.cc),
      bcc: normalizeOptionalRecipients(params.bcc),
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
    this.mirrorSentToImap({
      technicalEmail,
      fromHeader,
      to: replyAll.to,
      subject,
      text: params.text,
      smtpMessageId,
    });
    return { sentId: sent.id, smtpMessageId };
  }

  public async forward(params: {
    organizationId: string;
    inboundMessageId: string;
    to: string;
    text?: string;
    includeOriginal?: boolean;
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
      throw new ForbiddenException("Bu mesaj iletilemez");
    }
    const subject = inbound.subject.toLowerCase().startsWith("fwd:")
      ? inbound.subject
      : `Fwd: ${inbound.subject}`;
    const includeOriginal = params.includeOriginal !== false;
    const originalBlock = includeOriginal
      ? buildForwardOriginalBlock(inbound)
      : "";
    const text = [params.text?.trim() ?? "", originalBlock]
      .filter((part) => part.length > 0)
      .join("\n\n");
    if (!text.trim()) {
      throw new BadRequestException("İletilecek metin boş olamaz.");
    }
    const { fromHeader, fromEmail, envelopeMailFrom, technicalEmail } =
      await this.resolveSenderMailbox(params.organizationId);
    await this.assertRateLimit(params.organizationId);
    await this.mailTenantSuspensionService.assertOrganizationCanSend(
      params.organizationId,
    );
    const nodemailerAttachments = await this.parseAttachments(
      params.organizationId,
      params.attachments,
    );
    await this.mailOrganizationStorageService.assertCanStore(
      params.organizationId,
      text.length +
        nodemailerAttachments.reduce((sum, file) => sum + file.content.length, 0),
    );
    const replyTo =
      await this.mailOrganizationIdentityService.resolveOutboundReplyTo(
        params.organizationId,
      );
    const smtpMessageId = await this.smtpEmailSender.send({
      from: fromHeader,
      envelopeMailFrom,
      to: normalizeRecipientList(params.to),
      subject,
      text,
      html: `<pre>${escapeHtml(text)}</pre>`,
      replyTo,
      attachments: nodemailerAttachments,
    });
    this.mailOrganizationSendRateService.recordSend(params.organizationId);
    const sent = await this.sentRepository.save(
      this.sentRepository.create({
        organizationId: params.organizationId,
        mailboxId: mailbox.id,
        fromAddress: fromEmail,
        toAddress: normalizeRecipientList(params.to).toLowerCase(),
        subject,
        bodyText: text,
        relatedInboundMessageId: inbound.id,
        smtpMessageId,
      }),
    );
    this.mirrorSentToImap({
      technicalEmail,
      fromHeader,
      to: normalizeRecipientList(params.to),
      subject,
      text,
      smtpMessageId,
    });
    return { sentId: sent.id, smtpMessageId };
  }

  public async resolveSendReadiness(organizationId: string): Promise<{
    canSend: boolean;
    reasonTr: string | null;
    displayAddress: string | null;
    billingWarningTr: string | null;
    billingStatus: string | null;
  }> {
    const billing =
      await this.mailSubscriptionLifecycleService.getLifecycleView(
        organizationId,
      );
    if (!billing.canSendMail) {
      return {
        canSend: false,
        reasonTr: billing.detailTr || billing.statusLabelTr,
        displayAddress: null,
        billingWarningTr: null,
        billingStatus: billing.status,
      };
    }
    try {
      await this.mailTenantSuspensionService.assertOrganizationCanSend(
        organizationId,
      );
    } catch (error) {
      const reason =
        error instanceof ForbiddenException
          ? String(error.message)
          : "Gönderim askıya alındı.";
      return {
        canSend: false,
        reasonTr: reason,
        displayAddress: null,
        billingWarningTr: null,
        billingStatus: billing.status,
      };
    }
    const storage =
      await this.mailOrganizationStorageService.getSnapshot(organizationId);
    if (storage.atLimit) {
      return {
        canSend: false,
        reasonTr:
          "Depolama kotası dolu — yeni gönderim yapılamaz. Arşivleyin veya planı yükseltin.",
        displayAddress: null,
        billingWarningTr: billing.inGrace ? billing.detailTr : null,
        billingStatus: billing.status,
      };
    }
    const rate =
      await this.mailOrganizationSendRateService.getSnapshot(organizationId);
    if (rate.atLimit) {
      return {
        canSend: false,
        reasonTr: `Saatlik gönderim limitine ulaşıldı (${rate.limitPerHour}/saat).`,
        displayAddress: null,
        billingWarningTr: billing.inGrace ? billing.detailTr : null,
        billingStatus: billing.status,
      };
    }
    try {
      const { fromHeader: _from, technicalEmail: _tech, ...rest } =
        await this.resolveSenderMailbox(organizationId);
      void _from;
      void _tech;
      void rest;
      const primary =
        await this.mailOrganizationIdentityService.getPrimaryIdentity(
          organizationId,
        );
      return {
        canSend: true,
        reasonTr: null,
        displayAddress: primary.displayAddress ?? primary.fromAddress,
        billingWarningTr: billing.inGrace ? billing.detailTr : null,
        billingStatus: billing.status,
      };
    } catch (error) {
      const reason =
        error instanceof BadRequestException
          ? String(error.message)
          : "Gönderim şu an kullanılamıyor.";
      return {
        canSend: false,
        reasonTr: reason,
        displayAddress: null,
        billingWarningTr: billing.inGrace ? billing.detailTr : null,
        billingStatus: billing.status,
      };
    }
  }

  private mirrorSentToImap(params: {
    technicalEmail: string;
    fromHeader: string;
    to: string;
    subject: string;
    text: string;
    smtpMessageId: string | null;
  }): void {
    if (!this.mailImapMaildirService.isEnabled()) {
      return;
    }
    const mime = buildOutgoingSentMime({
      fromHeader: params.fromHeader,
      to: params.to,
      subject: params.subject,
      text: params.text,
      messageId: params.smtpMessageId,
      date: new Date(),
    });
    this.mailImapMaildirService.appendSentMessage({
      mailboxEmail: params.technicalEmail,
      rawMime: mime,
      messageId: params.smtpMessageId ?? `local-${Date.now()}`,
    });
  }

  public async listSent(organizationId: string, limit = 40) {
    const rows = await this.sentRepository.find({
      where: { organizationId, trashedAt: IsNull() },
      order: { sentAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => this.toSentListItem(row));
  }

  public async listTrashedSent(organizationId: string, limit = 50) {
    const rows = await this.sentRepository.find({
      where: { organizationId, trashedAt: Not(IsNull()) },
      order: { trashedAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => this.toSentListItem(row));
  }

  public async countTrashedSent(organizationId: string): Promise<number> {
    return this.sentRepository.count({
      where: { organizationId, trashedAt: Not(IsNull()) },
    });
  }

  public async trashSentMessage(
    organizationId: string,
    sentId: string,
  ): Promise<void> {
    const row = await this.sentRepository.findOne({ where: { id: sentId } });
    if (!row || row.organizationId !== organizationId) {
      throw new NotFoundException("Gönderilen mesaj bulunamadı");
    }
    row.trashedAt = new Date();
    await this.sentRepository.save(row);
  }

  public async restoreSentFromTrash(
    organizationId: string,
    sentId: string,
  ): Promise<void> {
    const row = await this.sentRepository.findOne({ where: { id: sentId } });
    if (!row || row.organizationId !== organizationId) {
      throw new NotFoundException("Gönderilen mesaj bulunamadı");
    }
    row.trashedAt = null;
    await this.sentRepository.save(row);
  }

  private toSentListItem(row: MailMailboxSentEntity) {
    return {
      id: row.id,
      toAddress: row.toAddress,
      subject: row.subject,
      sentAt: row.sentAt.toISOString(),
      relatedInboundMessageId: row.relatedInboundMessageId,
      trashedAt: row.trashedAt?.toISOString() ?? null,
    };
  }

  public async getSentMessage(organizationId: string, sentId: string) {
    const row = await this.sentRepository.findOne({ where: { id: sentId } });
    if (!row || row.organizationId !== organizationId) {
      throw new NotFoundException("Gönderilen mesaj bulunamadı");
    }
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      toAddress: row.toAddress,
      subject: row.subject,
      bodyText: row.bodyText,
      sentAt: row.sentAt.toISOString(),
      smtpMessageId: row.smtpMessageId,
      relatedInboundMessageId: row.relatedInboundMessageId,
    };
  }

  public async deleteSentMessage(
    organizationId: string,
    sentId: string,
  ): Promise<void> {
    const row = await this.sentRepository.findOne({ where: { id: sentId } });
    if (!row || row.organizationId !== organizationId) {
      throw new NotFoundException("Gönderilen mesaj bulunamadı");
    }
    if (!row.trashedAt) {
      throw new BadRequestException(
        "Kalıcı silmek için önce çöp kutusuna taşıyın.",
      );
    }
    await this.sentRepository.delete({ id: sentId, organizationId });
  }

  private async resolveSenderMailbox(organizationId: string) {
    await this.mailTenantSubdomainService
      .syncTenantDomainVerificationFromDns()
      .catch(() => undefined);

    const identity = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!identity?.mailDomain) {
      throw new BadRequestException(
        "Kurumsal posta kutusu tanımlı değil. Hesap → Organizasyon → E-posta kimliği veya yonetim.lerta.com.tr üzerinden adres alın.",
      );
    }

    await this.ensurePlatformManagedDomainVerified(
      organizationId,
      identity.mailDomain,
    );

    const refreshed = await this.mailDomainRepository.findOne({
      where: { id: identity.mailDomain.id },
    });
    if (!refreshed || refreshed.verificationStatus !== "verified") {
      throw new BadRequestException(
        "Doğrulanmış kurumsal gönderen kimliği gerekli.",
      );
    }
    identity.mailDomain = refreshed;
    const { publicAddress, technicalAddress } = resolveMailSenderAddresses(
      identity.localPart,
      identity.mailDomain,
    );
    const smtpFromEmail = resolveSmtpFromEmailAddress(
      { publicAddress, technicalAddress },
      this.notificationConfigurationService.resolveInstantPostFromMode(),
    );
    const fromHeader = formatMailFromHeader(
      smtpFromEmail,
      identity.displayName,
    );
    const envelopeMailFrom =
      publicAddress !== technicalAddress ? technicalAddress : undefined;
    let mailbox = await this.mailboxRepository.findOne({
      where: { organizationId, emailAddress: technicalAddress },
    });
    if (!mailbox) {
      mailbox = await this.mailboxRepository.save(
        this.mailboxRepository.create({
          organizationId,
          emailAddress: technicalAddress,
          status: "active",
          quotaBytes: "0",
        }),
      );
    }
    return {
      fromHeader,
      fromEmail: publicAddress,
      envelopeMailFrom,
      technicalEmail: technicalAddress,
      mailbox,
    };
  }

  private async ensurePlatformManagedDomainVerified(
    organizationId: string,
    mailDomain: MailDomainEntity,
  ): Promise<void> {
    if (mailDomain.verificationStatus === "verified") {
      return;
    }
    const snapshot = mailDomain.dnsSnapshot ?? {};
    if (
      snapshot.managedByPlatform === true ||
      snapshot.product === "lerta_post"
    ) {
      mailDomain.verificationStatus = "verified";
      await this.mailDomainRepository.save(mailDomain);
      return;
    }
    const primary =
      await this.mailOrganizationIdentityService.getPrimaryIdentity(
        organizationId,
      );
    const platformManaged =
      primary.platformDnsReady &&
      (primary.channel === "instant_post" ||
        primary.channel === "tenant_subdomain" ||
        primary.channel === "platform");
    if (platformManaged) {
      mailDomain.verificationStatus = "verified";
      await this.mailDomainRepository.save(mailDomain);
    }
  }

  private async assertRateLimit(organizationId: string): Promise<void> {
    try {
      await this.mailOrganizationSendRateService.assertCanSend(organizationId);
    } catch {
      throw new BadRequestException(
        "Kurumsal gönderim saatlik limiti aşıldı — daha sonra deneyin.",
      );
    }
  }

  private async parseAttachments(
    organizationId: string,
    attachments?: ComposeAttachmentInput[],
  ): Promise<{ filename: string; content: Buffer; contentType: string }[]> {
    if (!attachments?.length) {
      return [];
    }
    if (attachments.length > MailMailboxComposeService.maxAttachments) {
      throw new BadRequestException(
        `En fazla ${MailMailboxComposeService.maxAttachments} ek.`,
      );
    }
    const maxBytes =
      await this.mailOrganizationStorageService.resolveMaxAttachmentBytes(
        organizationId,
      );
    const maxMb = Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    return attachments.map((item) => {
      const content = Buffer.from(item.contentBase64, "base64");
      if (content.length > maxBytes) {
        throw new BadRequestException(
          `Ek çok büyük: ${item.filename} (plan limiti ${maxMb} MB)`,
        );
      }
      return {
        filename: item.filename.slice(0, 120),
        content,
        contentType: item.contentType || "application/octet-stream",
      };
    });
  }

  private resolveReplyAllRecipients(
    inbound: MailInboundMessageEntity,
    selfEmail: string,
    replyAll?: boolean,
    ccOverride?: string,
  ): { to: string; cc?: string } {
    if (!replyAll) {
      return { to: inbound.fromAddress, cc: ccOverride };
    }
    const self = selfEmail.toLowerCase();
    const participants = new Set<string>();
    participants.add(inbound.fromAddress.toLowerCase());
    for (const address of inbound.toRecipients ?? []) {
      participants.add(address.toLowerCase());
    }
    for (const address of inbound.ccRecipients ?? []) {
      participants.add(address.toLowerCase());
    }
    participants.delete(self);
    const ccList = [...participants].filter(
      (address) => address !== inbound.fromAddress.toLowerCase(),
    );
    return {
      to: inbound.fromAddress,
      cc: ccOverride ?? (ccList.length > 0 ? ccList.join(", ") : undefined),
    };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeRecipientList(raw: string): string {
  const parts = raw
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new BadRequestException("Alıcı e-posta gerekli.");
  }
  return parts.join(", ");
}

function normalizeOptionalRecipients(raw?: string): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  return normalizeRecipientList(raw);
}

function buildForwardOriginalBlock(inbound: MailInboundMessageEntity): string {
  const date = inbound.receivedAt.toLocaleString("tr-TR");
  const body =
    inbound.bodyText?.trim() ||
    stripHtml(inbound.bodyHtml ?? "") ||
    inbound.snippet ||
    "(İçerik yok)";
  return [
    "---------- İletilen mesaj ----------",
    `Kimden: ${inbound.fromAddress}`,
    `Tarih: ${date}`,
    `Konu: ${inbound.subject}`,
    "",
    body,
  ].join("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function resolveOutboundHtml(text: string, html?: string): string {
  if (html?.trim()) {
    return sanitizeOutboundHtml(html.trim());
  }
  return `<pre>${escapeHtml(text)}</pre>`;
}

function sanitizeOutboundHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}
