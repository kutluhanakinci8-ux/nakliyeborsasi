import {
  Body,
  Controller,
  Get,
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
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PlatformNotificationSettingsService } from "./PlatformNotificationSettingsService";
import { NotificationEventCode, EmailRecipientKind } from "./NotificationEventCode";
import { UpdatePlatformNotificationSettingDto } from "./UpdatePlatformNotificationSettingDto";
import { TestNotificationEmailDto } from "./TestNotificationEmailDto";

@Controller("platform-admin/notifications")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformNotificationAdminController {
  public constructor(
    private readonly platformNotificationSettingsService: PlatformNotificationSettingsService,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

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

  @Get("outbox")
  public async outbox(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    return {
      messages: await this.emailOutboxService.listRecent(
        Number.isFinite(parsed) ? parsed : 50,
      ),
    };
  }

  @Post("test")
  public async testSend(@Body() body: TestNotificationEmailDto) {
    const eventCode = body.eventCode as NotificationEventCode;
    const samplePayload = {
      displayName: "Lerta Logistics (test)",
      emailAddress: "lertalogistics@gmail.com",
      companyLegalName: "Lerta Logistics",
      companyCountryCode: "TR",
      participantType: "LOAD_CARRIER",
      planCode: "carrier_professional_tr_ua",
      companyId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      ipAddress: "127.0.0.1",
      userAgent: "Test/1.0",
      loginCount: "1",
      occurredAt: new Date().toISOString(),
      organizasyonUrl: `${this.notificationConfigurationService.resolveWebBaseUrl()}/hesap/organizasyon`,
    };
    const row = await this.emailOutboxService.enqueue({
      eventCode,
      recipientKind: EmailRecipientKind.Admin,
      recipientEmail: body.recipientEmail,
      locale: "tr",
      payload: samplePayload,
      idempotencyKey: `TEST:${eventCode}:${body.recipientEmail}:${Date.now()}`,
    });
    return { message: "OK", outboxId: row?.id };
  }
}
