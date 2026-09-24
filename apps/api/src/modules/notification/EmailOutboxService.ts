import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailRecipientKind, NotificationEventCode } from "./NotificationEventCode";
import { EmailTemplateService } from "./EmailTemplateService";
import { SmtpEmailSender } from "./SmtpEmailSender";
import { EmailHtmlTrackingService } from "./EmailHtmlTrackingService";
import { EmailEngagementService } from "./EmailEngagementService";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { UserNotificationPreferenceService } from "./UserNotificationPreferenceService";
import { EmailDeliveryService } from "./EmailDeliveryService";
import { MailSenderResolutionService } from "./MailSenderResolutionService";
import { MailOrganizationSendRateService } from "./MailOrganizationSendRateService";

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);

  public constructor(
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly smtpEmailSender: SmtpEmailSender,
    private readonly emailHtmlTrackingService: EmailHtmlTrackingService,
    private readonly emailEngagementService: EmailEngagementService,
    private readonly emailSuppressionService: EmailSuppressionService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
    private readonly emailDeliveryService: EmailDeliveryService,
    private readonly mailSenderResolutionService: MailSenderResolutionService,
    private readonly mailOrganizationSendRateService: MailOrganizationSendRateService,
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
    if (await this.emailSuppressionService.isSuppressed(params.recipientEmail)) {
      this.logger.warn(
        `Suppressed recipient skipped: ${params.recipientEmail}`,
      );
      return null;
    }
    const userId =
      typeof params.metadata?.userId === "string"
        ? params.metadata.userId
        : null;
    if (
      params.recipientKind === EmailRecipientKind.User &&
      userId &&
      !(await this.userNotificationPreferenceService.isUserEmailAllowed(
        userId,
        params.eventCode,
      ))
    ) {
      this.logger.debug(
        `User preference blocked ${params.eventCode} for ${userId}`,
      );
      return null;
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
      const htmlWithTracking = await this.emailHtmlTrackingService.applyTracking(
        row.id,
        row.htmlBody,
      );
      row.htmlBody = htmlWithTracking;
      const resolved =
        await this.mailSenderResolutionService.resolveFromForOutbox(
          row.metadata,
        );
      if (resolved.tenantOrganizationId) {
        this.mailOrganizationSendRateService.assertCanSend(
          resolved.tenantOrganizationId,
        );
      }
      const delivery = await this.emailDeliveryService.send({
        to: row.recipientEmail,
        subject: row.subject,
        html: htmlWithTracking,
        text: row.textBody,
        from: resolved.from,
      });
      if (resolved.tenantOrganizationId) {
        this.mailOrganizationSendRateService.recordSend(
          resolved.tenantOrganizationId,
        );
      }
      row.status = "sent";
      row.sentAt = new Date();
      row.providerMessageId = delivery.messageId;
      row.metadata = {
        ...(row.metadata ?? {}),
        deliveryProvider: delivery.provider,
      };
      row.lastError = null;
      await this.outboxRepository.save(row);
    } catch (error) {
      row.status = "failed";
      row.lastError =
        error instanceof Error ? error.message : "Unknown send error";
      await this.outboxRepository.save(row);
      await this.emailEngagementService.recordBounceForOutbox(
        row.id,
        row.lastError,
      );
      throw error;
    }
  }

  public async listRecent(limit: number): Promise<EmailOutboxEntity[]> {
    return this.outboxRepository.find({
      order: { createdAt: "DESC" },
      take: Math.min(limit, 200),
    });
  }

  public async getOutboxStats(): Promise<{
    sent: number;
    pending: number;
    failed: number;
    last24hSent: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sent, pending, failed, last24hSent] = await Promise.all([
      this.outboxRepository.count({ where: { status: "sent" } }),
      this.outboxRepository.count({ where: { status: "pending" } }),
      this.outboxRepository.count({ where: { status: "failed" } }),
      this.outboxRepository
        .createQueryBuilder("row")
        .where("row.status = :status", { status: "sent" })
        .andWhere("row.sentAt >= :since", { since })
        .getCount(),
    ]);
    return { sent, pending, failed, last24hSent };
  }

  public async drainQueue(batchSize = 25): Promise<{ processed: number; sent: number; failed: number }> {
    const rows = await this.outboxRepository.find({
      where: { status: In(["pending", "failed"]) },
      order: { createdAt: "ASC" },
      take: batchSize,
    });
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      const retryCount = Number(row.metadata?.retryCount ?? 0);
      if (row.status === "failed" && retryCount >= 8) {
        continue;
      }
      try {
        row.status = "pending";
        await this.outboxRepository.save(row);
        await this.processById(row.id);
        sent += 1;
      } catch {
        failed += 1;
        const meta = { ...(row.metadata ?? {}), retryCount: retryCount + 1 };
        row.metadata = meta;
        await this.outboxRepository.save(row);
      }
    }
    return { processed: rows.length, sent, failed };
  }

  public async retryById(id: string): Promise<EmailOutboxEntity | null> {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row || row.status === "sent") {
      return row;
    }
    row.status = "pending";
    row.lastError = null;
    row.metadata = { ...(row.metadata ?? {}), retryCount: 0 };
    await this.outboxRepository.save(row);
    await this.processById(row.id);
    return this.outboxRepository.findOne({ where: { id } });
  }

  public async retryFailed(limit = 50): Promise<number> {
    const rows = await this.outboxRepository.find({
      where: { status: "failed" },
      order: { updatedAt: "ASC" },
      take: limit,
    });
    let count = 0;
    for (const row of rows) {
      await this.retryById(row.id);
      count += 1;
    }
    return count;
  }
}
