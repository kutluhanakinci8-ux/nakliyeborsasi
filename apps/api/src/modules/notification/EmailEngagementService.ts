import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { EmailOutboxEngagementEventEntity } from "../../infrastructure/database/entities/EmailOutboxEngagementEventEntity";
import { EmailOutboxClickTokenEntity } from "../../infrastructure/database/entities/EmailOutboxClickTokenEntity";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailTrackingSignatureService } from "./EmailTrackingSignatureService";
import {
  classifySmtpDeliveryFailure,
  shouldAutoSuppressForBounceClass,
  type BounceClass,
} from "./SmtpDeliveryFailureClassifier";
import { EmailSuppressionService } from "./EmailSuppressionService";

@Injectable()
export class EmailEngagementService {
  public constructor(
    @InjectRepository(EmailOutboxEngagementEventEntity)
    private readonly eventRepository: Repository<EmailOutboxEngagementEventEntity>,
    @InjectRepository(EmailOutboxClickTokenEntity)
    private readonly clickTokenRepository: Repository<EmailOutboxClickTokenEntity>,
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
    private readonly emailTrackingSignatureService: EmailTrackingSignatureService,
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public async recordOpen(
    token: string,
    request: Request,
  ): Promise<void> {
    const outboxId = this.emailTrackingSignatureService.verifyOpenToken(token);
    if (!outboxId) {
      return;
    }
    const row = await this.outboxRepository.findOne({ where: { id: outboxId } });
    if (!row || row.status !== "sent") {
      return;
    }
    row.openCount += 1;
    if (!row.firstOpenedAt) {
      row.firstOpenedAt = new Date();
    }
    await this.outboxRepository.save(row);
    await this.eventRepository.save(
      this.eventRepository.create({
        outboxId,
        eventType: "open",
        linkUrl: null,
        bounceClass: null,
        smtpCode: null,
        userAgent: this.readUserAgent(request),
        ipAddress: this.readIp(request),
      }),
    );
  }

  public async resolveClickRedirect(
    token: string,
    request: Request,
  ): Promise<string | null> {
    const clickRow = await this.clickTokenRepository.findOne({
      where: { token },
    });
    if (!clickRow) {
      return null;
    }
    const outbox = await this.outboxRepository.findOne({
      where: { id: clickRow.outboxId },
    });
    if (!outbox || outbox.status !== "sent") {
      return clickRow.targetUrl;
    }
    outbox.clickCount += 1;
    await this.outboxRepository.save(outbox);
    await this.eventRepository.save(
      this.eventRepository.create({
        outboxId: clickRow.outboxId,
        eventType: "click",
        linkUrl: clickRow.targetUrl,
        bounceClass: null,
        smtpCode: null,
        userAgent: this.readUserAgent(request),
        ipAddress: this.readIp(request),
      }),
    );
    return clickRow.targetUrl;
  }

  public async recordBounceForOutbox(
    outboxId: string,
    errorMessage: string,
  ): Promise<void> {
    const classified = classifySmtpDeliveryFailure(errorMessage);
    const row = await this.outboxRepository.findOne({ where: { id: outboxId } });
    if (!row) {
      return;
    }
    row.bounceClass = classified.bounceClass;
    row.metadata = {
      ...(row.metadata ?? {}),
      bounceClass: classified.bounceClass,
      smtpCode: classified.smtpCode,
    };
    await this.outboxRepository.save(row);
    await this.eventRepository.save(
      this.eventRepository.create({
        outboxId,
        eventType: "bounce",
        linkUrl: null,
        bounceClass: classified.bounceClass,
        smtpCode: classified.smtpCode,
        userAgent: null,
        ipAddress: null,
      }),
    );
    if (shouldAutoSuppressForBounceClass(classified.bounceClass)) {
      await this.emailSuppressionService.addSuppression({
        email: row.recipientEmail,
        reason: `bounce:${classified.bounceClass}`,
        source: "smtp_auto",
        note: errorMessage.slice(0, 500),
      });
    }
  }

  public async getEngagementSummary(since: Date): Promise<{
    sentInPeriod: number;
    uniqueOpens: number;
    totalOpens: number;
    totalClicks: number;
    messagesWithClicks: number;
    bounces: number;
    openRatePercent: number | null;
    clickRatePercent: number | null;
    bounceRatePercent: number | null;
    bounceByClass: Record<string, number>;
  }> {
    const sentRows: Array<{ count: string }> = await this.outboxRepository.query(
      `
      SELECT COUNT(*)::text AS count
      FROM email_outbox
      WHERE status = 'sent' AND "sentAt" >= $1
      `,
      [since],
    );
    const sentInPeriod = Number.parseInt(sentRows[0]?.count ?? "0", 10);

    const openRows: Array<{ unique_opens: string; total_opens: string }> =
      await this.outboxRepository.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE "openCount" > 0)::text AS unique_opens,
          COALESCE(SUM("openCount"), 0)::text AS total_opens
        FROM email_outbox
        WHERE status = 'sent' AND "sentAt" >= $1
        `,
        [since],
      );
    const uniqueOpens = Number.parseInt(
      openRows[0]?.unique_opens ?? "0",
      10,
    );
    const totalOpens = Number.parseInt(openRows[0]?.total_opens ?? "0", 10);

    const clickRows: Array<{ total_clicks: string; messages: string }> =
      await this.outboxRepository.query(
        `
        SELECT
          COALESCE(SUM("clickCount"), 0)::text AS total_clicks,
          COUNT(*) FILTER (WHERE "clickCount" > 0)::text AS messages
        FROM email_outbox
        WHERE status = 'sent' AND "sentAt" >= $1
        `,
        [since],
      );
    const totalClicks = Number.parseInt(
      clickRows[0]?.total_clicks ?? "0",
      10,
    );
    const messagesWithClicks = Number.parseInt(
      clickRows[0]?.messages ?? "0",
      10,
    );

    const bounceRows: Array<{ count: string }> = await this.eventRepository.query(
      `
      SELECT COUNT(DISTINCT "outboxId")::text AS count
      FROM email_outbox_engagement_events
      WHERE "eventType" = 'bounce' AND "occurredAt" >= $1
      `,
      [since],
    );
    const bounces = Number.parseInt(bounceRows[0]?.count ?? "0", 10);

    const classRows: Array<{ bounce_class: string; count: string }> =
      await this.eventRepository.query(
        `
        SELECT "bounceClass" AS bounce_class, COUNT(*)::text AS count
        FROM email_outbox_engagement_events
        WHERE "eventType" = 'bounce' AND "occurredAt" >= $1 AND "bounceClass" IS NOT NULL
        GROUP BY "bounceClass"
        `,
        [since],
      );
    const bounceByClass: Record<string, number> = {};
    for (const row of classRows) {
      bounceByClass[row.bounce_class] = Number.parseInt(row.count, 10);
    }

    const attempted = sentInPeriod + bounces;
    return {
      sentInPeriod,
      uniqueOpens,
      totalOpens,
      totalClicks,
      messagesWithClicks,
      bounces,
      openRatePercent:
        sentInPeriod > 0
          ? Math.round((uniqueOpens / sentInPeriod) * 1000) / 10
          : null,
      clickRatePercent:
        sentInPeriod > 0
          ? Math.round((messagesWithClicks / sentInPeriod) * 1000) / 10
          : null,
      bounceRatePercent:
        attempted > 0 ? Math.round((bounces / attempted) * 1000) / 10 : null,
      bounceByClass,
    };
  }

  private readUserAgent(request: Request): string | null {
    const value = request.headers["user-agent"];
    return typeof value === "string" ? value.slice(0, 512) : null;
  }

  private readIp(request: Request): string | null {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? null;
    }
    return request.ip ?? null;
  }
}
