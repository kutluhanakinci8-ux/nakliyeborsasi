import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { EmailSuppressionService } from "./EmailSuppressionService";

export type MailDeliveryDailyPoint = {
  day: string;
  sentCount: number;
};

@Injectable()
export class MailOrganizationDeliveryService {
  public constructor(
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public async getDeliveryPanel(organizationId: string, days = 7) {
    const resolvedDays = days <= 0 || days > 30 ? 7 : days;
    const since = this.startOfUtcDay(this.daysAgo(resolvedDays - 1));

    const sentTotal = await this.sentRepository.count({
      where: {
        organizationId,
        sentAt: MoreThanOrEqual(since),
      },
    });

    const dailyRows: Array<{ day: string; count: string }> =
      await this.sentRepository.query(
        `
        SELECT to_char(date_trunc('day', s."sentAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
               COUNT(*)::text AS count
        FROM mail_mailbox_sent s
        WHERE s."organizationId" = $1
          AND s."sentAt" >= $2
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        [organizationId, since],
      );

    const daily: MailDeliveryDailyPoint[] = dailyRows.map((row) => ({
      day: row.day,
      sentCount: Number.parseInt(row.count, 10),
    }));

    const recentSends = await this.sentRepository.find({
      where: {
        organizationId,
        sentAt: MoreThanOrEqual(since),
      },
      order: { sentAt: "DESC" },
      take: 50,
    });

    const suppressions =
      await this.emailSuppressionService.listForOrganization(organizationId, 100);
    const bounceSuppressions = suppressions.filter((row) =>
      row.reason.toLowerCase().startsWith("bounce:"),
    );

    return {
      days: resolvedDays,
      periodStart: since.toISOString(),
      sent: {
        total: sentTotal,
        daily,
        recent: recentSends.map((row) => ({
          id: row.id,
          toAddress: row.toAddress,
          subject: row.subject,
          sentAt: row.sentAt.toISOString(),
          smtpMessageId: row.smtpMessageId,
        })),
      },
      suppressions: {
        total: suppressions.length,
        bounceRelated: bounceSuppressions.length,
        items: suppressions.map((row) => ({
          emailAddress: row.emailAddress,
          reason: row.reason,
          source: row.source,
          note: row.note,
          updatedAt: row.updatedAt.toISOString(),
        })),
      },
    };
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
