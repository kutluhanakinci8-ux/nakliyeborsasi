import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailEngagementService } from "./EmailEngagementService";
import { ConfigService } from "@nestjs/config";

export type EmailOutboxDailyPoint = {
  day: string;
  enqueued: number;
  sent: number;
  failed: number;
  pending: number;
};

export type EmailOutboxEventBreakdownRow = {
  eventCode: string;
  sent: number;
  failed: number;
  pending: number;
  total: number;
};

export type EmailOutboxAnalyticsSummary = {
  days: number;
  enqueued: number;
  sent: number;
  failed: number;
  pending: number;
  successRatePercent: number | null;
  avgQueueSeconds: number | null;
  previousPeriod: {
    enqueued: number;
    sent: number;
    failed: number;
    successRatePercent: number | null;
  };
  maturityScorePercent: number;
  maturityTargetPercent: number;
  maturityPhase: string;
  engagement: {
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
  };
};

@Injectable()
export class EmailOutboxAnalyticsService {
  public constructor(
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
    private readonly emailEngagementService: EmailEngagementService,
    private readonly configService: ConfigService,
  ) {}

  public resolveDays(raw?: string): number {
    const parsed = raw ? Number.parseInt(raw, 10) : 30;
    if (!Number.isFinite(parsed)) {
      return 30;
    }
    if (parsed <= 7) {
      return 7;
    }
    return 30;
  }

  public async getSummary(days: number): Promise<EmailOutboxAnalyticsSummary> {
    const since = this.startOfDayUtc(this.daysAgo(days - 1));
    const prevSince = this.startOfDayUtc(this.daysAgo(days * 2 - 1));
    const prevUntil = since;

    const current = await this.periodCounts(since, new Date());
    const previous = await this.periodCounts(prevSince, prevUntil);

    const attempted = current.sent + current.failed;
    const successRatePercent =
      attempted > 0 ? Math.round((current.sent / attempted) * 1000) / 10 : null;
    const prevAttempted = previous.sent + previous.failed;
    const prevSuccessRate =
      prevAttempted > 0
        ? Math.round((previous.sent / prevAttempted) * 1000) / 10
        : null;

    const avgQueueSeconds = await this.averageQueueSeconds(since);

    const engagement = await this.emailEngagementService.getEngagementSummary(
      since,
    );

    const smtpProfile =
      this.configService.get<string>("SMTP_PROFILE")?.trim().toLowerCase() ??
      "mailpit";
    const smtpHost = this.configService.get<string>("SMTP_HOST") ?? "";
    const ownMtaProduction =
      smtpProfile === "custom" &&
      smtpHost !== "127.0.0.1" &&
      smtpHost !== "localhost";
    const maturityScorePercent = this.computeMaturityScore({
      hasDailySeries: true,
      hasEventBreakdown: true,
      hasExport: true,
      hasPreview: true,
      hasExtendedKpi: true,
      hasOpenTracking: true,
      hasBounceClassification: true,
      hasSuppression: true,
      hasOrgPreferences: true,
      hasOwnMtaProduction: ownMtaProduction,
    });

    return {
      days,
      enqueued: current.enqueued,
      sent: current.sent,
      failed: current.failed,
      pending: current.pending,
      successRatePercent,
      avgQueueSeconds,
      previousPeriod: {
        enqueued: previous.enqueued,
        sent: previous.sent,
        failed: previous.failed,
        successRatePercent: prevSuccessRate,
      },
      maturityScorePercent,
      maturityTargetPercent: 100,
      maturityPhase: "F3/F4 — Politika, suppression, kendi MTA",
      engagement,
    };
  }

  public async getDailySeries(days: number): Promise<EmailOutboxDailyPoint[]> {
    const since = this.startOfDayUtc(this.daysAgo(days - 1));
    const rows: Array<{
      day: string;
      enqueued: string;
      sent: string;
      failed: string;
      pending: string;
    }> = await this.outboxRepository.query(
      `
      SELECT
        to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::text AS enqueued,
        COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending
      FROM email_outbox
      WHERE created_at >= $1
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [since],
    );

    const byDay = new Map<string, EmailOutboxDailyPoint>();
    for (const row of rows) {
      byDay.set(row.day, {
        day: row.day,
        enqueued: Number.parseInt(row.enqueued, 10),
        sent: Number.parseInt(row.sent, 10),
        failed: Number.parseInt(row.failed, 10),
        pending: Number.parseInt(row.pending, 10),
      });
    }

    const series: EmailOutboxDailyPoint[] = [];
    for (let index = days - 1; index >= 0; index -= 1) {
      const day = this.formatDayKey(this.daysAgo(index));
      series.push(
        byDay.get(day) ?? {
          day,
          enqueued: 0,
          sent: 0,
          failed: 0,
          pending: 0,
        },
      );
    }
    return series;
  }

  public async getEventBreakdown(
    days: number,
  ): Promise<EmailOutboxEventBreakdownRow[]> {
    const since = this.startOfDayUtc(this.daysAgo(days - 1));
    const rows: Array<{
      event_code: string;
      sent: string;
      failed: string;
      pending: string;
      total: string;
    }> = await this.outboxRepository.query(
      `
      SELECT
        event_code,
        COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
        COUNT(*)::text AS total
      FROM email_outbox
      WHERE created_at >= $1
      GROUP BY event_code
      ORDER BY COUNT(*) DESC
      `,
      [since],
    );

    return rows.map((row) => ({
      eventCode: row.event_code,
      sent: Number.parseInt(row.sent, 10),
      failed: Number.parseInt(row.failed, 10),
      pending: Number.parseInt(row.pending, 10),
      total: Number.parseInt(row.total, 10),
    }));
  }

  public async getMessageById(id: string): Promise<EmailOutboxEntity> {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException("Outbox message not found");
    }
    return row;
  }

  public async listForExport(params: {
    days: number;
    status?: "all" | "sent" | "pending" | "failed";
    limit: number;
  }): Promise<EmailOutboxEntity[]> {
    const since = this.startOfDayUtc(this.daysAgo(params.days - 1));
    const qb = this.outboxRepository
      .createQueryBuilder("row")
      .where("row.createdAt >= :since", { since })
      .orderBy("row.createdAt", "DESC")
      .take(params.limit);

    if (params.status && params.status !== "all") {
      qb.andWhere("row.status = :status", { status: params.status });
    }

    return qb.getMany();
  }

  public buildCsv(rows: EmailOutboxEntity[]): string {
    const header = [
      "id",
      "createdAt",
      "sentAt",
      "eventCode",
      "recipientKind",
      "recipientEmail",
      "subject",
      "status",
      "lastError",
      "providerMessageId",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.createdAt.toISOString(),
          row.sentAt?.toISOString() ?? "",
          row.eventCode,
          row.recipientKind,
          row.recipientEmail,
          row.subject,
          row.status,
          row.lastError ?? "",
          row.providerMessageId ?? "",
        ]
          .map((cell) => this.csvEscape(String(cell)))
          .join(","),
      );
    }
    return `${lines.join("\n")}\n`;
  }

  private computeMaturityScore(flags: {
    hasDailySeries: boolean;
    hasEventBreakdown: boolean;
    hasExport: boolean;
    hasPreview: boolean;
    hasExtendedKpi: boolean;
    hasOpenTracking: boolean;
    hasBounceClassification: boolean;
    hasSuppression: boolean;
    hasOrgPreferences: boolean;
    hasOwnMtaProduction: boolean;
  }): number {
    const baseline = 42;
    const f1Ready =
      flags.hasDailySeries &&
      flags.hasEventBreakdown &&
      flags.hasExport &&
      flags.hasPreview &&
      flags.hasExtendedKpi;
    let score = baseline;
    if (f1Ready) {
      score += 13;
    }
    if (flags.hasOpenTracking) {
      score += 13;
    }
    if (flags.hasBounceClassification) {
      score += 10;
    }
    if (flags.hasSuppression) {
      score += 8;
    }
    if (flags.hasOrgPreferences) {
      score += 14;
    }
    if (flags.hasOwnMtaProduction) {
      score += 10;
    }
    return Math.min(100, score);
  }

  private async periodCounts(
    since: Date,
    until: Date,
  ): Promise<{ enqueued: number; sent: number; failed: number; pending: number }> {
    const row: Array<{
      enqueued: string;
      sent: string;
      failed: string;
      pending: string;
    }> = await this.outboxRepository.query(
      `
      SELECT
        COUNT(*)::text AS enqueued,
        COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
        COUNT(*) FILTER (WHERE status = 'pending')::text AS pending
      FROM email_outbox
      WHERE created_at >= $1 AND created_at < $2
      `,
      [since, until],
    );
    const first = row[0];
    return {
      enqueued: Number.parseInt(first?.enqueued ?? "0", 10),
      sent: Number.parseInt(first?.sent ?? "0", 10),
      failed: Number.parseInt(first?.failed ?? "0", 10),
      pending: Number.parseInt(first?.pending ?? "0", 10),
    };
  }

  private async averageQueueSeconds(since: Date): Promise<number | null> {
    const row: Array<{ avg_seconds: string | null }> =
      await this.outboxRepository.query(
        `
        SELECT AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))::text AS avg_seconds
        FROM email_outbox
        WHERE status = 'sent' AND sent_at IS NOT NULL AND created_at >= $1
        `,
        [since],
      );
    const value = row[0]?.avg_seconds;
    if (!value) {
      return null;
    }
    const seconds = Number.parseFloat(value);
    return Number.isFinite(seconds) ? Math.round(seconds * 10) / 10 : null;
  }

  private csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private daysAgo(offset: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    return date;
  }

  private startOfDayUtc(date: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }

  private formatDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
