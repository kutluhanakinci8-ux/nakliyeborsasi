import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { EmailDeliveryHealthService } from "./EmailDeliveryHealthService";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailOutboxAnalyticsService } from "./EmailOutboxAnalyticsService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { NotificationEventCode, EmailRecipientKind } from "./NotificationEventCode";
import { UpdatePlatformNotificationSettingDto } from "./UpdatePlatformNotificationSettingDto";
import { TestNotificationEmailDto } from "./TestNotificationEmailDto";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { EmailDeliveryService } from "./EmailDeliveryService";
import { NOTIFICATION_EVENT_CATALOG } from "./NotificationEventCatalog";
import { PlatformMailSendingService } from "./PlatformMailSendingService";

@Controller("platform-admin/notifications")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformNotificationAdminController {
  public constructor(
    private readonly platformNotificationSettingsService: PlatformNotificationSettingsService,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailOutboxAnalyticsService: EmailOutboxAnalyticsService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly emailSuppressionService: EmailSuppressionService,
    private readonly emailDeliveryService: EmailDeliveryService,
    private readonly platformMailSendingService: PlatformMailSendingService,
  ) {}

  @Get("platform-sending")
  public async platformSending() {
    return {
      snapshot: await this.platformMailSendingService.buildSnapshot(),
    };
  }

  @Get("catalog")
  public catalog() {
    return { events: NOTIFICATION_EVENT_CATALOG };
  }

  @Get("suppressions")
  public async suppressions(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 200;
    return {
      suppressions: await this.emailSuppressionService.list(
        Number.isFinite(parsed) ? parsed : 200,
      ),
    };
  }

  @Post("suppressions")
  public async addSuppression(
    @Body() body: { email: string; reason?: string; note?: string },
  ) {
    const row = await this.emailSuppressionService.addSuppression({
      email: body.email,
      reason: body.reason ?? "manual",
      source: "admin",
      note: body.note,
    });
    return { suppression: row };
  }

  @Delete("suppressions")
  public async removeSuppression(@Query("email") email: string) {
    const removed = await this.emailSuppressionService.removeSuppression(email);
    return { ok: removed };
  }

  @Get("delivery")
  public deliveryInfo() {
    const smtp = this.notificationConfigurationService.resolveSmtpConfig();
    return {
      mode: this.emailDeliveryService.resolveMode(),
      smtpProfile: this.notificationConfigurationService.resolveSmtpProfile(),
      smtpHost: smtp.host,
      smtpPort: smtp.port,
      policyTr:
        "Gönderim yalnızca kendi SMTP/MTA (Postfix). Üçüncü taraf ESP (Postmark, SES, Gmail relay) kullanılmaz.",
      bounceHandlingTr:
        "Bounce ve suppression: SMTP hata sınıflandırması, admin listesi ve (Faz C) kendi inbound webhook.",
    };
  }

  @Get("health")
  public async health() {
    return {
      health: this.emailDeliveryHealthService.getSnapshot(),
    };
  }

  @Post("health/verify")
  public async verifySmtp() {
    try {
      await this.emailDeliveryHealthService.verifySmtpConnection();
      return { ok: true, health: this.emailDeliveryHealthService.getSnapshot() };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SMTP verify failed";
      this.emailDeliveryHealthService.captureVerifyFailure(message);
      return {
        ok: false,
        error: message,
        health: this.emailDeliveryHealthService.getSnapshot(),
      };
    }
  }

  @Post("outbox/drain")
  public async drainOutbox() {
    const result = await this.emailOutboxService.drainQueue();
    return { ok: true, ...result };
  }

  @Post("outbox/retry-failed")
  public async retryFailed() {
    const count = await this.emailOutboxService.retryFailed();
    return { ok: true, retried: count };
  }

  @Post("outbox/:id/retry")
  public async retryOne(@Param("id") id: string) {
    const row = await this.emailOutboxService.retryById(id);
    return { ok: true, message: row };
  }

  @Get("settings")
  public async settings() {
    return {
      settings: await this.platformNotificationSettingsService.listSettings(),
    };
  }

  @Patch("settings")
  public async updateSetting(@Body() body: UpdatePlatformNotificationSettingDto) {
    const updated = await this.platformNotificationSettingsService.updateSetting(
      body.eventCode,
      {
        adminEmailEnabled: body.adminEmailEnabled,
        userEmailEnabled: body.userEmailEnabled,
        adminRecipientEmails: body.adminRecipientEmails?.map((e) =>
          e.trim().toLowerCase(),
        ),
      },
    );
    return { setting: updated };
  }

  @Get("outbox/stats")
  public async outboxStats() {
    return { stats: await this.emailOutboxService.getOutboxStats() };
  }

  @Get("analytics/summary")
  public async analyticsSummary(@Query("days") days?: string) {
    const resolved = this.emailOutboxAnalyticsService.resolveDays(days);
    return {
      summary: await this.emailOutboxAnalyticsService.getSummary(resolved),
    };
  }

  @Get("analytics/daily")
  public async analyticsDaily(@Query("days") days?: string) {
    const resolved = this.emailOutboxAnalyticsService.resolveDays(days);
    return {
      days: resolved,
      series: await this.emailOutboxAnalyticsService.getDailySeries(resolved),
    };
  }

  @Get("analytics/events")
  public async analyticsEvents(@Query("days") days?: string) {
    const resolved = this.emailOutboxAnalyticsService.resolveDays(days);
    return {
      days: resolved,
      events: await this.emailOutboxAnalyticsService.getEventBreakdown(resolved),
    };
  }

  @Get("outbox/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  public async outboxExport(
    @Query("days") days?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ): Promise<string> {
    const resolvedDays = this.emailOutboxAnalyticsService.resolveDays(days);
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 5000;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 10000)
      : 5000;
    const statusFilter =
      status === "sent" || status === "pending" || status === "failed"
        ? status
        : "all";
    const rows = await this.emailOutboxAnalyticsService.listForExport({
      days: resolvedDays,
      status: statusFilter,
      limit: safeLimit,
    });
    return this.emailOutboxAnalyticsService.buildCsv(rows);
  }

  @Get("outbox/:id")
  public async outboxDetail(@Param("id") id: string) {
    const message = await this.emailOutboxAnalyticsService.getMessageById(id);
    return { message };
  }

  @Get("outbox")
  public async outbox(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    const messages = await this.emailOutboxService.listRecent(
      Number.isFinite(parsed) ? parsed : 50,
    );
    return {
      messages: messages.map((row) => ({
        id: row.id,
        eventCode: row.eventCode,
        recipientKind: row.recipientKind,
        recipientEmail: row.recipientEmail,
        subject: row.subject,
        status: row.status,
        lastError: row.lastError,
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        locale: row.locale,
        providerMessageId: row.providerMessageId,
        openCount: row.openCount,
        clickCount: row.clickCount,
        bounceClass: row.bounceClass,
      })),
    };
  }

  @Post("test")
  public async testSend(@Body() body: TestNotificationEmailDto) {
    const eventCode = body.eventCode as NotificationEventCode;
    const samplePayload = {
      displayName: "Lerta Logistics (test)",
      emailAddress: "admin@lerta.tr",
      companyLegalName: "Lerta Logistics",
      companyCountryCode: "TR",
      participantType: "LOAD_CARRIER",
      planCode: "carrier_professional_tr_ua",
      companyId:
        body.organizationId ?? "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      ipAddress: "127.0.0.1",
      userAgent: "Test/1.0",
      loginCount: "1",
      occurredAt: new Date().toISOString(),
      organizasyonUrl: `${this.notificationConfigurationService.resolveWebBaseUrl()}/hesap/organizasyon`,
    };
    const companyId =
      body.organizationId ?? "00000000-0000-0000-0000-000000000001";
    const row = await this.emailOutboxService.enqueue({
      eventCode,
      recipientKind: EmailRecipientKind.Admin,
      recipientEmail: body.recipientEmail,
      locale: "tr",
      payload: samplePayload,
      metadata: { companyId },
      idempotencyKey: `TEST:${eventCode}:${body.recipientEmail}:${Date.now()}`,
    });
    return { message: "OK", outboxId: row?.id };
  }
}
