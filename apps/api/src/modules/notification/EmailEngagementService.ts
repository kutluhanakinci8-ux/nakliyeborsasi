import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { readOrganizationIdFromOutboxMetadata } from "@nakliyeborsasi/core";
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
import { MailOrganizationWebhookDispatcherService } from "./MailOrganizationWebhookDispatcherService";
import type { MailWebhookEventType } from "../../infrastructure/database/entities/MailOrganizationWebhookEndpointEntity";

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
    private readonly mailOrganizationWebhookDispatcherService: MailOrganizationWebhookDispatcherService,
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
    this.dispatchEngagementWebhook(row, "message.opened", {
      openCount: row.openCount,
      firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    });
    this.dispatchCampaignEngagementWebhook(row, "campaign.opened", {
      openCount: row.openCount,
      firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    });
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
    this.dispatchEngagementWebhook(outbox, "message.clicked", {
      linkUrl: clickRow.targetUrl,
      clickCount: outbox.clickCount,
    });
    this.dispatchCampaignEngagementWebhook(outbox, "campaign.clicked", {
      linkUrl: clickRow.targetUrl,
      clickCount: outbox.clickCount,
    });
    return clickRow.targetUrl;
  }

  public async recordBounceForOutbox(
    outboxId: string,
    errorMessage: string,
    organizationIdForSuppression?: string | null,
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
        organizationId: organizationIdForSuppression ?? null,
      });
    }
    this.dispatchEngagementWebhook(row, "message.bounced", {
      bounceClass: classified.bounceClass,
      smtpCode: classified.smtpCode,
      errorMessage: errorMessage.slice(0, 500),
    });
  }

  private dispatchEngagementWebhook(
    row: EmailOutboxEntity,
    event: MailWebhookEventType,
    extra: Record<string, unknown>,
  ): void {
    const organizationId = this.resolveOrganizationId(row);
    if (!organizationId) {
      return;
    }
    this.mailOrganizationWebhookDispatcherService.dispatch(organizationId, event, {
      messageId: row.id,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      eventCode: row.eventCode,
      ...extra,
    });
  }

  private dispatchCampaignEngagementWebhook(
    row: EmailOutboxEntity,
    event: MailWebhookEventType,
    extra: Record<string, unknown>,
  ): void {
    const organizationId = this.resolveOrganizationId(row);
    const campaignId = this.readCampaignIdFromMetadata(row.metadata);
    if (!organizationId || !campaignId) {
      return;
    }
    this.mailOrganizationWebhookDispatcherService.dispatch(organizationId, event, {
      campaignId,
      messageId: row.id,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      ...extra,
    });
  }

  private readCampaignIdFromMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): string | null {
    const raw = metadata?.marketingCampaignId ?? metadata?.campaignId;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  }

  public async getCampaignEngagementTotals(
    campaignId: string,
    organizationId: string,
  ): Promise<{
    trackedSends: number;
    uniqueOpens: number;
    totalOpens: number;
    totalClicks: number;
    messagesWithClicks: number;
  }> {
    const rows: Array<{
      tracked: string;
      unique_opens: string;
      total_opens: string;
      total_clicks: string;
      with_clicks: string;
    }> = await this.outboxRepository.query(
      `
      SELECT
        COUNT(*)::text AS tracked,
        COUNT(*) FILTER (WHERE "openCount" > 0)::text AS unique_opens,
        COALESCE(SUM("openCount"), 0)::text AS total_opens,
        COALESCE(SUM("clickCount"), 0)::text AS total_clicks,
        COUNT(*) FILTER (WHERE "clickCount" > 0)::text AS with_clicks
      FROM email_outbox
      WHERE status = 'sent'
        AND metadata->>'marketingCampaignId' = $1
        AND (metadata->>'organizationId' = $2 OR metadata->>'companyId' = $2)
      `,
      [campaignId, organizationId],
    );
    const row = rows[0];
    return {
      trackedSends: Number.parseInt(row?.tracked ?? "0", 10),
      uniqueOpens: Number.parseInt(row?.unique_opens ?? "0", 10),
      totalOpens: Number.parseInt(row?.total_opens ?? "0", 10),
      totalClicks: Number.parseInt(row?.total_clicks ?? "0", 10),
      messagesWithClicks: Number.parseInt(row?.with_clicks ?? "0", 10),
    };
  }

  private resolveOrganizationId(row: EmailOutboxEntity): string | null {
    return readOrganizationIdFromOutboxMetadata(row.metadata);
  }

  private outboxOrganizationSql(
    tableOrAlias: string,
    paramIndex: number,
  ): string {
    return ` AND (${tableOrAlias}.metadata->>'organizationId' = $${paramIndex} OR ${tableOrAlias}.metadata->>'companyId' = $${paramIndex})`;
  }

  public async getEngagementSummary(
    since: Date,
    organizationId?: string | null,
  ): Promise<{
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
    dailyOpenClick: Array<{ day: string; opens: number; clicks: number }>;
    providerBreakdown: Array<{
      provider: string;
      opens: number;
      clicks: number;
    }>;
  }> {
    const org = organizationId?.trim() || null;
    const outboxOrg = org ? this.outboxOrganizationSql("email_outbox", 2) : "";
    const params: (Date | string)[] = org ? [since, org] : [since];

    const sentRows: Array<{ count: string }> = await this.outboxRepository.query(
      `
      SELECT COUNT(*)::text AS count
      FROM email_outbox
      WHERE status = 'sent' AND "sentAt" >= $1${outboxOrg}
      `,
      params,
    );
    const sentInPeriod = Number.parseInt(sentRows[0]?.count ?? "0", 10);

    const openRows: Array<{ unique_opens: string; total_opens: string }> =
      await this.outboxRepository.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE "openCount" > 0)::text AS unique_opens,
          COALESCE(SUM("openCount"), 0)::text AS total_opens
        FROM email_outbox
        WHERE status = 'sent' AND "sentAt" >= $1${outboxOrg}
        `,
        params,
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
        WHERE status = 'sent' AND "sentAt" >= $1${outboxOrg}
        `,
        params,
      );
    const totalClicks = Number.parseInt(
      clickRows[0]?.total_clicks ?? "0",
      10,
    );
    const messagesWithClicks = Number.parseInt(
      clickRows[0]?.messages ?? "0",
      10,
    );

    const bounceJoin = org
      ? `INNER JOIN email_outbox o ON o.id = e."outboxId"`
      : "";
    const bounceOrg = org ? this.outboxOrganizationSql("o", 2) : "";
    const bounceRows: Array<{ count: string }> = await this.eventRepository.query(
      `
      SELECT COUNT(DISTINCT e."outboxId")::text AS count
      FROM email_outbox_engagement_events e
      ${bounceJoin}
      WHERE e."eventType" = 'bounce' AND e."occurredAt" >= $1${bounceOrg}
      `,
      params,
    );
    const bounces = Number.parseInt(bounceRows[0]?.count ?? "0", 10);

    const classRows: Array<{ bounce_class: string; count: string }> =
      await this.eventRepository.query(
        `
        SELECT e."bounceClass" AS bounce_class, COUNT(*)::text AS count
        FROM email_outbox_engagement_events e
        ${bounceJoin}
        WHERE e."eventType" = 'bounce' AND e."occurredAt" >= $1 AND e."bounceClass" IS NOT NULL${bounceOrg}
        GROUP BY e."bounceClass"
        `,
        params,
      );
    const bounceByClass: Record<string, number> = {};
    for (const row of classRows) {
      bounceByClass[row.bounce_class] = Number.parseInt(row.count, 10);
    }

    const attempted = sentInPeriod + bounces;
    const dailyOpenClick = await this.loadDailyOpenClickSeries(since, org);
    const providerBreakdown = await this.loadProviderBreakdown(since, org);
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
      dailyOpenClick,
      providerBreakdown,
    };
  }

  private async loadDailyOpenClickSeries(
    since: Date,
    organizationId: string | null,
  ): Promise<Array<{ day: string; opens: number; clicks: number }>> {
    const org = organizationId?.trim() || null;
    const join = org ? `INNER JOIN email_outbox o ON o.id = e."outboxId"` : "";
    const orgSql = org ? this.outboxOrganizationSql("o", 2) : "";
    const params: (Date | string)[] = org ? [since, org] : [since];
    const rows: Array<{ day: string; opens: string; clicks: string }> =
      await this.eventRepository.query(
        `
        SELECT
          to_char(date_trunc('day', e."occurredAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE e."eventType" = 'open')::text AS opens,
          COUNT(*) FILTER (WHERE e."eventType" = 'click')::text AS clicks
        FROM email_outbox_engagement_events e
        ${join}
        WHERE e."occurredAt" >= $1
          AND e."eventType" IN ('open', 'click')${orgSql}
        GROUP BY 1
        ORDER BY 1 ASC
        `,
        params,
      );
    return rows.map((row) => ({
      day: row.day,
      opens: Number.parseInt(row.opens, 10),
      clicks: Number.parseInt(row.clicks, 10),
    }));
  }

  private async loadProviderBreakdown(
    since: Date,
    organizationId: string | null,
  ): Promise<Array<{ provider: string; opens: number; clicks: number }>> {
    const org = organizationId?.trim() || null;
    const join = org ? `INNER JOIN email_outbox o ON o.id = e."outboxId"` : "";
    const orgSql = org ? this.outboxOrganizationSql("o", 2) : "";
    const params: (Date | string)[] = org ? [since, org] : [since];
    const rows: Array<{
      user_agent: string | null;
      opens: string;
      clicks: string;
    }> = await this.eventRepository.query(
      `
      SELECT
        e."userAgent" AS user_agent,
        COUNT(*) FILTER (WHERE e."eventType" = 'open')::text AS opens,
        COUNT(*) FILTER (WHERE e."eventType" = 'click')::text AS clicks
      FROM email_outbox_engagement_events e
      ${join}
      WHERE e."occurredAt" >= $1
        AND e."eventType" IN ('open', 'click')${orgSql}
      GROUP BY e."userAgent"
      `,
      params,
    );
    const byProvider = new Map<string, { opens: number; clicks: number }>();
    for (const row of rows) {
      const provider = this.classifyEngagementClientProvider(row.user_agent);
      const bucket = byProvider.get(provider) ?? { opens: 0, clicks: 0 };
      bucket.opens += Number.parseInt(row.opens, 10);
      bucket.clicks += Number.parseInt(row.clicks, 10);
      byProvider.set(provider, bucket);
    }
    return [...byProvider.entries()]
      .map(([provider, counts]) => ({
        provider,
        opens: counts.opens,
        clicks: counts.clicks,
      }))
      .sort((a, b) => b.opens + b.clicks - (a.opens + a.clicks));
  }

  private classifyEngagementClientProvider(userAgent: string | null): string {
    const ua = (userAgent ?? "").toLowerCase();
    if (!ua) {
      return "unknown";
    }
    if (ua.includes("googleimageproxy") || ua.includes("gmail")) {
      return "gmail";
    }
    if (ua.includes("outlook") || ua.includes("microsoft")) {
      return "outlook";
    }
    if (ua.includes("yahoo")) {
      return "yahoo";
    }
    if (ua.includes("apple") || ua.includes("iphone") || ua.includes("ipad")) {
      return "apple_mail";
    }
    if (ua.includes("thunderbird")) {
      return "thunderbird";
    }
    return "other";
  }

  public async getBounceIntelligence(
    since: Date,
    organizationId?: string | null,
  ): Promise<{
    hardBounces: number;
    softBounces: number;
    topBounceDomains: Array<{ domain: string; count: number }>;
    autoSuppressedLastPeriod: number;
    reputationHintTr: string;
  }> {
    const org = organizationId?.trim() || null;
    const bounceJoin = org
      ? `INNER JOIN email_outbox o ON o.id = e."outboxId"`
      : "";
    const bounceOrg = org ? this.outboxOrganizationSql("o", 2) : "";
    const params: (Date | string)[] = org ? [since, org] : [since];
    const classRows: Array<{ bounce_class: string; count: string }> =
      await this.eventRepository.query(
        `
        SELECT e."bounceClass" AS bounce_class, COUNT(*)::text AS count
        FROM email_outbox_engagement_events e
        ${bounceJoin}
        WHERE e."eventType" = 'bounce' AND e."occurredAt" >= $1 AND e."bounceClass" IS NOT NULL${bounceOrg}
        GROUP BY e."bounceClass"
        `,
        params,
      );
    let hardBounces = 0;
    let softBounces = 0;
    for (const row of classRows) {
      const count = Number.parseInt(row.count, 10);
      if (/hard|permanent|invalid/i.test(row.bounce_class)) {
        hardBounces += count;
      } else {
        softBounces += count;
      }
    }
    const domainRows: Array<{ domain: string; count: string }> =
      await this.eventRepository.query(
        `
        SELECT
          lower(split_part(o."recipientEmail", '@', 2)) AS domain,
          COUNT(*)::text AS count
        FROM email_outbox_engagement_events e
        INNER JOIN email_outbox o ON o.id = e."outboxId"
        WHERE e."eventType" = 'bounce' AND e."occurredAt" >= $1${bounceOrg}
          AND o."recipientEmail" LIKE '%@%'
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 8
        `,
        params,
      );
    const topBounceDomains = domainRows
      .filter((row) => row.domain?.trim())
      .map((row) => ({
        domain: row.domain,
        count: Number.parseInt(row.count, 10),
      }));
    const summary = await this.getEngagementSummary(since, organizationId);
    let reputationHintTr = "Teslimat itibarı stabil görünüyor.";
    if (
      summary.bounceRatePercent != null &&
      summary.bounceRatePercent >= 5
    ) {
      reputationHintTr =
        "Bounce oranı yüksek — listeyi temizleyin ve hard bounce alan adresleri suppression’a alın.";
    } else if (hardBounces > softBounces && hardBounces >= 3) {
      reputationHintTr =
        "Kalıcı (hard) bounce artışı — alan adı veya adres kalitesini gözden geçirin.";
    }
    return {
      hardBounces,
      softBounces,
      topBounceDomains,
      autoSuppressedLastPeriod: 0,
      reputationHintTr,
    };
  }

  public async buildEngagementExportCsv(
    since: Date,
    limit = 5000,
    organizationId?: string | null,
  ): Promise<string> {
    const safeLimit = Math.min(Math.max(limit, 1), 10000);
    const org = organizationId?.trim() || null;
    const orgSql = org ? this.outboxOrganizationSql("o", 2) : "";
    const exportParams: (Date | string | number)[] = org
      ? [since, org, safeLimit]
      : [since, safeLimit];
    const limitIndex = org ? 3 : 2;
    const rows: Array<{
      occurred_at: Date;
      outbox_id: string;
      organization_id: string | null;
      recipient_email: string | null;
      event_type: string;
      link_url: string | null;
      bounce_class: string | null;
      smtp_code: string | null;
      ip_address: string | null;
    }> = await this.eventRepository.query(
      `
      SELECT
        e."occurredAt" AS occurred_at,
        e."outboxId" AS outbox_id,
        COALESCE(o.metadata->>'organizationId', o.metadata->>'companyId') AS organization_id,
        o."recipientEmail" AS recipient_email,
        e."eventType" AS event_type,
        e."linkUrl" AS link_url,
        e."bounceClass" AS bounce_class,
        e."smtpCode" AS smtp_code,
        e."ipAddress" AS ip_address
      FROM email_outbox_engagement_events e
      LEFT JOIN email_outbox o ON o.id = e."outboxId"
      WHERE e."occurredAt" >= $1${orgSql}
      ORDER BY e."occurredAt" DESC
      LIMIT $${limitIndex}
      `,
      exportParams,
    );
    const escape = (value: string | null | undefined): string => {
      const raw = value ?? "";
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };
    const lines = [
      "occurredAt,outboxId,organizationId,recipientEmail,eventType,linkUrl,bounceClass,smtpCode,ipAddress",
    ];
    for (const row of rows) {
      lines.push(
        [
          row.occurred_at.toISOString(),
          row.outbox_id,
          escape(row.organization_id),
          escape(row.recipient_email),
          row.event_type,
          escape(row.link_url),
          escape(row.bounce_class),
          escape(row.smtp_code),
          escape(row.ip_address),
        ].join(","),
      );
    }
    return `${lines.join("\n")}\n`;
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
