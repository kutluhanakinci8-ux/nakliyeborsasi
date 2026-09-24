import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { EmailTemplateService } from "./EmailTemplateService";
import { SmtpEmailSender } from "./SmtpEmailSender";

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);

  public constructor(
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly smtpEmailSender: SmtpEmailSender,
  ) {}

  public async enqueue(params: {
    eventCode: NotificationEventCode;
    recipientKind: EmailRecipientKind;
    recipientEmail: string;
    locale: string;
    payload: Record<string, string>;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<EmailOutboxEntity | null> {
    const existing = await this.outboxRepository.findOne({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return existing;
    }
    const audience =
      params.recipientKind === EmailRecipientKind.Admin ? "admin" : "user";
    const rendered = this.emailTemplateService.render(
      params.eventCode,
      params.locale,
      audience,
      params.payload,
    );
    const row = await this.outboxRepository.save(
      this.outboxRepository.create({
        eventCode: params.eventCode,
        recipientKind: params.recipientKind,
        recipientEmail: params.recipientEmail.toLowerCase(),
        locale: params.locale,
        subject: rendered.subject,
        htmlBody: rendered.html,
        textBody: rendered.text,
        status: "pending",
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata ?? null,
        providerMessageId: null,
        lastError: null,
        sentAt: null,
      }),
    );
    void this.processById(row.id).catch((error) => {
      this.logger.error(`Outbox process failed: ${row.id}`, error);
    });
    return row;
  }

  public async processById(id: string): Promise<void> {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row || row.status === "sent") {
      return;
    }
    try {
      const messageId = await this.smtpEmailSender.send({
        to: row.recipientEmail,
        subject: row.subject,
        html: row.htmlBody,
        text: row.textBody,
      });
      row.status = "sent";
      row.sentAt = new Date();
      row.providerMessageId = messageId;
      row.lastError = null;
      await this.outboxRepository.save(row);
    } catch (error) {
      row.status = "failed";
      row.lastError =
        error instanceof Error ? error.message : "Unknown send error";
      await this.outboxRepository.save(row);
      throw error;
    }
  }

  public async listRecent(limit: number): Promise<EmailOutboxEntity[]> {
    return this.outboxRepository.find({
      order: { createdAt: "DESC" },
      take: Math.min(limit, 200),
    });
  }
}
