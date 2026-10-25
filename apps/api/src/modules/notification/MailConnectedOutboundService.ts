import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";
import { buildOutgoingSentMime } from "./MailSentMimeBuilder";
import { randomUUID } from "node:crypto";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

export type ConnectedSendProvider = "microsoft_graph" | "gmail_api";

export type ConnectedOutboundMessage = {
  organizationId: string;
  actorUserId?: string;
  provider: ConnectedSendProvider;
  accountId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  gmailThreadId?: string | null;
};

@Injectable()
export class MailConnectedOutboundService {
  public constructor(
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeAccountRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly gmailAccountRepository: Repository<MailGmailSyncAccountEntity>,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  public async send(
    message: ConnectedOutboundMessage,
  ): Promise<{ providerMessageId: string | null; fromAddress: string }> {
    if (message.provider === "microsoft_graph") {
      const account = await this.exchangeAccountRepository.findOne({
        where: {
          id: message.accountId,
          organizationId: message.organizationId,
          enabled: true,
        },
      });
      if (!account) {
        throw new NotFoundException("Microsoft bağlantısı bulunamadı.");
      }
      const providerMessageId =
        await this.mailExchangeGraphSyncService.sendMailMessage(
          message.organizationId,
          account.id,
          {
            subject: message.subject,
            bodyHtml: message.html ?? wrapTextAsHtml(message.text),
            to: splitAddresses(message.to),
            cc: splitAddresses(message.cc),
            bcc: splitAddresses(message.bcc),
          },
        );
      await this.auditSend(message, account.emailAddress, providerMessageId);
      return { providerMessageId, fromAddress: account.emailAddress };
    }
    const account = await this.gmailAccountRepository.findOne({
      where: {
        id: message.accountId,
        organizationId: message.organizationId,
        enabled: true,
      },
    });
    if (!account) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const fromHeader = account.displayName
      ? `${account.displayName} <${account.emailAddress}>`
      : account.emailAddress;
    const rawMime = buildOutgoingSentMime({
      fromHeader,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      messageId: message.inReplyTo ?? `<${randomUUID()}@lerta.connected>`,
      date: new Date(),
    });
    const result = await this.mailGmailSyncService.sendRawMessage(
      message.organizationId,
      account.id,
      rawMime,
      message.gmailThreadId,
    );
    await this.auditSend(message, account.emailAddress, result.providerMessageId);
    return {
      providerMessageId: result.providerMessageId,
      fromAddress: account.emailAddress,
    };
  }

  private async auditSend(
    message: ConnectedOutboundMessage,
    fromAddress: string,
    providerMessageId: string | null,
  ): Promise<void> {
    if (!message.actorUserId) {
      return;
    }
    await this.mailIdentityAuditService.record({
      actorUserId: message.actorUserId,
      actorCompanyId: message.organizationId,
      actionCode: MailIdentityAuditAction.ConnectedAccountOutboundSent,
      metadata: {
        provider: message.provider,
        accountId: message.accountId,
        fromAddress,
        to: message.to,
        providerMessageId,
      },
    });
  }
}

function splitAddresses(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.includes("@"));
}

function wrapTextAsHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="white-space:pre-wrap;font-family:sans-serif">${escaped}</div>`;
}
