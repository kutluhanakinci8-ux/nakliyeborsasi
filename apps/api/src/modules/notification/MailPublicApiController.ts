import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { EmailOutboxService } from "./EmailOutboxService";
import { MailPublicApiGuard } from "./MailPublicApiGuard";
import { MailPublicApiContextParam } from "./MailPublicApiRequestParam";
import type { MailPublicApiRequestContext } from "./MailPublicApiGuard";
import { MailPublicApiSendMessageDto } from "./MailPublicApiDto";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";

@Controller("public/lerta-mail/v1")
@UseGuards(MailPublicApiGuard)
export class MailPublicApiController {
  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
  ) {}

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
