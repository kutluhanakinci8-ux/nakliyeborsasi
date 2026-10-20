import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailOutboxService } from "./EmailOutboxService";
import { MailPublicApiGuard } from "./MailPublicApiGuard";
import { MailPublicApiContextParam } from "./MailPublicApiRequestParam";
import type { MailPublicApiRequestContext } from "./MailPublicApiGuard";
import { MailPublicApiSendMessageDto } from "./MailPublicApiDto";
import { MailPublicApiCampaignDto } from "./MailPublicApiCampaignDto";
import { CloneMailCampaignRequestDto } from "./CloneMailCampaignRequestDto";
import { MailMarketingCampaignService } from "./MailMarketingCampaignService";
import type { MailMarketingCampaignStatus } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

@Controller("public/lerta-mail/v1")
@UseGuards(MailPublicApiGuard)
export class MailPublicApiController {
  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailMarketingCampaignService: MailMarketingCampaignService,
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
  ) {}

  @Get("docs")
  public docs() {
    return {
      version: "v1",
      basePath: "/api/v1/public/lerta-mail/v1",
      authentication:
        "Authorization: Bearer <api-key> veya X-Lerta-Mail-Api-Key başlığı",
      endpoints: [
        {
          method: "GET",
          path: "/organization",
          description: "Kurum plan özetı",
        },
        {
          method: "POST",
          path: "/messages",
          description: "Tekil transaksiyonel mesaj (outbox)",
        },
        {
          method: "GET",
          path: "/messages/:id",
          description: "Outbox mesaj durumu",
        },
        {
          method: "POST",
          path: "/campaigns",
          description:
            "Pazarlama kampanyası (max 25 alıcı, scheduleAt, segment, A/B konu)",
        },
        {
          method: "GET",
          path: "/campaigns/summary",
          description: "30 günlük kampanya özetı ve availableTags",
        },
        {
          method: "GET",
          path: "/campaigns",
          description: "Kampanya listesi (limit, offset, status, tag, q)",
        },
        {
          method: "GET",
          path: "/campaigns/:campaignId",
          description: "Kampanya durumu ve alıcı/sonuç detayı",
        },
        {
          method: "POST",
          path: "/campaigns/:campaignId/clone",
          description: "Kampanyayı yeni scheduleAt ile zamanla (mode=schedule)",
        },
        {
          method: "POST",
          path: "/campaigns/:campaignId/resend-failed",
          description: "Başarısız alıcıları yeniden gönder",
        },
        {
          method: "GET",
          path: "/campaigns/:campaignId/export.csv",
          description: "Alıcı durum CSV",
        },
        {
          method: "GET",
          path: "/docs",
          description: "Bu özet",
        },
      ],
      campaignWebhooks: [
        "campaign.scheduled",
        "campaign.reminder",
        "campaign.started",
        "campaign.completed",
        "campaign.failed",
        "campaign.cancelled",
      ],
      markdown: "/docs/LERTA_MAIL_PUBLIC_API.md",
    };
  }

  @Get("organization")
  public async organization(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
  ) {
    const plan = await this.mailSaasSubscriptionService.getOrganizationMailPlan(
      ctx.organizationId,
    );
    return {
      organizationId: ctx.organizationId,
      planCode: plan.planCode,
      planDisplayName: plan.plan?.displayName ?? null,
    };
  }

  @Post("messages")
  public async sendMessage(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Body() body: MailPublicApiSendMessageDto,
  ) {
    const textBody =
      body.text?.trim() ||
      body.html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
      body.subject;
    const htmlBody =
      body.html?.trim() ||
      `<p>${escapeHtmlMinimal(textBody)}</p>`;
    const idempotencyKey =
      body.idempotencyKey?.trim() ||
      `MAIL_API:${ctx.organizationId}:${body.to.toLowerCase()}:${body.subject}:${Date.now()}`;
    const row = await this.emailOutboxService.enqueueTenantApiMessage({
      organizationId: ctx.organizationId,
      recipientEmail: body.to,
      subject: body.subject.trim(),
      htmlBody,
      textBody,
      idempotencyKey: idempotencyKey.slice(0, 128),
      apiKeyId: ctx.apiKeyId,
    });
    return {
      messageId: row?.id ?? null,
      status: row?.status ?? "skipped",
      idempotencyKey,
    };
  }

  @Get("campaigns/summary")
  public async campaignSummary(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
  ) {
    const summary =
      await this.mailMarketingCampaignService.getSummaryForOrganization(
        ctx.organizationId,
      );
    return { summary };
  }

  @Get("campaigns")
  public async listCampaigns(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: string,
    @Query("tag") tag?: string,
    @Query("q") q?: string,
  ) {
    const parsed = limit ? Number.parseInt(limit, 10) : 20;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : 0;
    const allowed: MailMarketingCampaignStatus[] = [
      "scheduled",
      "running",
      "completed",
      "failed",
      "cancelled",
    ];
    const statusFilter =
      status && allowed.includes(status as MailMarketingCampaignStatus)
        ? (status as MailMarketingCampaignStatus)
        : undefined;
    const list = await this.mailMarketingCampaignService.listForOrganization(
      ctx.organizationId,
      Number.isFinite(parsed) ? parsed : 20,
      statusFilter,
      tag?.trim() || undefined,
      q?.trim() || undefined,
      Number.isFinite(parsedOffset) ? parsedOffset : 0,
    );
    return list;
  }

  @Post("campaigns/:campaignId/resend-failed")
  public async resendFailedCampaign(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Param("campaignId") campaignId: string,
  ) {
    const outcome = await this.mailMarketingCampaignService.resendFailed(
      ctx.organizationId,
      campaignId,
    );
    return outcome;
  }

  @Post("campaigns/:campaignId/clone")
  public async cloneCampaign(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Param("campaignId") campaignId: string,
    @Body() body: CloneMailCampaignRequestDto,
  ) {
    const mode = body.mode ?? "schedule";
    if (mode === "compose") {
      throw new BadRequestException(
        "Public API yalnızca mode=schedule destekler.",
      );
    }
    const scheduleAt = body.scheduleAt ? new Date(body.scheduleAt) : null;
    if (!scheduleAt || Number.isNaN(scheduleAt.getTime())) {
      throw new BadRequestException("scheduleAt zorunlu.");
    }
    const outcome = await this.mailMarketingCampaignService.cloneCampaign({
      organizationId: ctx.organizationId,
      campaignId,
      mode: "schedule",
      scheduleAt,
    });
    return outcome;
  }

  @Get("campaigns/:campaignId/export.csv")
  public async exportCampaignCsv(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Param("campaignId") campaignId: string,
    @Res() res: Response,
  ) {
    const { filename, csv } =
      await this.mailMarketingCampaignService.exportCampaignCsv(
        ctx.organizationId,
        campaignId,
      );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.send(`\uFEFF${csv}`);
  }

  @Get("campaigns/:campaignId")
  public async getCampaign(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Param("campaignId") campaignId: string,
  ) {
    const campaign = await this.mailMarketingCampaignService.getForOrganization(
      ctx.organizationId,
      campaignId,
    );
    return { campaign };
  }

  @Post("campaigns")
  public async createCampaign(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Body() body: MailPublicApiCampaignDto,
  ) {
    const scheduleAt = body.scheduleAt ? new Date(body.scheduleAt) : null;
    if (scheduleAt && Number.isNaN(scheduleAt.getTime())) {
      throw new BadRequestException("scheduleAt geçersiz.");
    }
    const outcome = await this.mailMarketingCampaignService.createAndRunOrSchedule({
      organizationId: ctx.organizationId,
      subject: body.subject,
      scheduleAt,
      payload: {
        text: body.text,
        html: body.html,
        recipients: body.recipients.map((row) => ({
          email: row.email,
          musteriAdi: row.musteriAdi,
          referans: row.referans,
        })),
        delayMsBetweenRecipients: body.delayMsBetweenRecipients,
        subjectB: body.subjectB?.trim() || undefined,
        recipientDomainAllowlist: body.recipientDomainAllowlist,
        segment: body.segment,
        reminderMinutesBefore: body.reminderMinutesBefore,
        notifyCreator: false,
        tags: body.tags,
      },
    });
    const result = outcome.result;
    return {
      campaignId: outcome.campaignId,
      scheduled: outcome.scheduled,
      scheduleAt: outcome.scheduleAt,
      attempted: result?.attempted ?? body.recipients.length,
      sent: result?.sent ?? 0,
      skippedSuppressed: result?.skippedSuppressed ?? 0,
      failed: result?.failed ?? [],
    };
  }

  @Get("messages/:id")
  public async getMessage(
    @MailPublicApiContextParam() ctx: MailPublicApiRequestContext,
    @Param("id") id: string,
  ) {
    const row = await this.outboxRepository.findOne({ where: { id } });
    if (!row) {
      return { message: "NOT_FOUND" };
    }
    const companyId =
      typeof row.metadata?.companyId === "string" ? row.metadata.companyId : null;
    if (companyId !== ctx.organizationId) {
      return { message: "NOT_FOUND" };
    }
    return {
      id: row.id,
      status: row.status,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      sentAt: row.sentAt?.toISOString() ?? null,
      lastError: row.lastError,
      providerMessageId: row.providerMessageId,
    };
  }
}

function escapeHtmlMinimal(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
