import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import {
  MailMarketingCampaignEntity,
  MailMarketingCampaignPayload,
  MailMarketingCampaignResult,
} from "../../infrastructure/database/entities/MailMarketingCampaignEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { MailMailboxComposeService } from "./MailMailboxComposeService";
import type { ComposeAttachmentInput } from "./MailMailboxComposeService";
import { MailOrganizationWebhookDispatcherService } from "./MailOrganizationWebhookDispatcherService";
import { EmailSuppressionService } from "./EmailSuppressionService";
import { buildCampaignRecipientExportCsv } from "./MailCampaignExportCsv";
import type { MailMarketingCampaignStatus } from "../../infrastructure/database/entities/MailMarketingCampaignEntity";

const MAX_SCHEDULE_DAYS = 7;
const MIN_SCHEDULE_LEAD_MS = 60_000;
const MIN_REMINDER_MINUTES = 5;
const MAX_REMINDER_MINUTES = 1440;

@Injectable()
export class MailMarketingCampaignService {
  public constructor(
    @InjectRepository(MailMarketingCampaignEntity)
    private readonly campaignRepository: Repository<MailMarketingCampaignEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    private readonly mailOrganizationWebhookDispatcherService: MailOrganizationWebhookDispatcherService,
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public async createAndRunOrSchedule(params: {
    organizationId: string;
    userId?: string;
    subject: string;
    payload: MailMarketingCampaignPayload;
    scheduleAt?: Date | null;
  }): Promise<{
    campaignId: string;
    scheduled: boolean;
    scheduleAt: string | null;
    result?: MailMarketingCampaignResult;
  }> {
    const scheduleAt = params.scheduleAt ?? null;
    const now = Date.now();
    if (scheduleAt) {
      const lead = scheduleAt.getTime() - now;
      if (lead < MIN_SCHEDULE_LEAD_MS) {
        throw new BadRequestException(
          "Zamanlanmış kampanya en az 1 dakika sonrası için olmalı.",
        );
      }
      const maxAt = now + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000;
      if (scheduleAt.getTime() > maxAt) {
        throw new BadRequestException(
          `Kampanya en fazla ${MAX_SCHEDULE_DAYS} gün sonrasına planlanabilir.`,
        );
      }
      const reminderMin = params.payload.reminderMinutesBefore;
      if (reminderMin !== undefined) {
        if (
          reminderMin < MIN_REMINDER_MINUTES ||
          reminderMin > MAX_REMINDER_MINUTES
        ) {
          throw new BadRequestException(
            `Hatırlatma ${MIN_REMINDER_MINUTES}–${MAX_REMINDER_MINUTES} dakika arasında olmalı.`,
          );
        }
        if (reminderMin * 60_000 >= lead) {
          throw new BadRequestException(
            "Hatırlatma, gönderim zamanından önce olmalı.",
          );
        }
      }
    } else if (params.payload.reminderMinutesBefore !== undefined) {
      throw new BadRequestException(
        "Hatırlatma yalnızca zamanlanmış kampanyalarda kullanılabilir.",
      );
    }
    const row = await this.campaignRepository.save(
      this.campaignRepository.create({
        organizationId: params.organizationId,
        createdByUserId: params.userId ?? null,
        subject: params.subject.trim(),
        status: scheduleAt ? "scheduled" : "running",
        scheduleAt,
        startedAt: scheduleAt ? null : new Date(),
        payload: params.payload,
        result: null,
        errorMessage: null,
      }),
    );
    if (scheduleAt) {
      this.emitCampaignEvent(row, "campaign.scheduled");
      if (params.payload.notifyCreator && params.userId) {
        await this.notifyScheduledCreator(
          params.organizationId,
          params.userId,
          row,
          "zamanlandı",
        );
      }
      return {
        campaignId: row.id,
        scheduled: true,
        scheduleAt: scheduleAt.toISOString(),
      };
    }
    const result = await this.executeCampaignRow(row, params.userId);
    return {
      campaignId: row.id,
      scheduled: false,
      scheduleAt: null,
      result,
    };
  }

  public async cloneCampaign(params: {
    organizationId: string;
    campaignId: string;
    userId?: string;
    mode: "compose" | "schedule";
    scheduleAt?: Date | null;
  }) {
    const source = await this.campaignRepository.findOne({
      where: { id: params.campaignId, organizationId: params.organizationId },
    });
    if (!source) {
      throw new NotFoundException("Kampanya bulunamadı.");
    }
    const compose = this.buildComposeFromRow(source);
    if (params.mode === "compose") {
      return { mode: "compose" as const, compose };
    }
    if (!params.scheduleAt || Number.isNaN(params.scheduleAt.getTime())) {
      throw new BadRequestException("scheduleAt zorunlu.");
    }
    const payload: MailMarketingCampaignPayload = {
      ...source.payload,
      reminderDispatchedAt: null,
    };
    const outcome = await this.createAndRunOrSchedule({
      organizationId: params.organizationId,
      userId: params.userId,
      subject: source.subject,
      scheduleAt: params.scheduleAt,
      payload,
    });
    return { mode: "schedule" as const, ...outcome };
  }

  public async getForOrganization(organizationId: string, campaignId: string) {
    const row = await this.campaignRepository.findOne({
      where: { id: campaignId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kampanya bulunamadı.");
    }
    return this.toDetail(row);
  }

  public async listForOrganization(
    organizationId: string,
    limit = 40,
    status?: MailMarketingCampaignStatus,
  ) {
    const rows = await this.campaignRepository.find({
      where: status ? { organizationId, status } : { organizationId },
      order: { createdAt: "DESC" },
      take: Math.min(80, Math.max(1, limit)),
    });
    return rows.map((row) => this.toListItem(row));
  }

  public async exportCampaignCsv(
    organizationId: string,
    campaignId: string,
  ): Promise<{ filename: string; csv: string }> {
    const row = await this.campaignRepository.findOne({
      where: { id: campaignId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Kampanya bulunamadı.");
    }
    const recipientStatus = await this.resolveRecipientExportStatuses(
      row,
      organizationId,
    );
    const safeSubject = row.subject
      .replace(/[^\w\u00C0-\u024F\s-]+/g, "")
      .trim()
      .slice(0, 40)
      .replace(/\s+/g, "-");
    const filename = `kampanya-${safeSubject || row.id.slice(0, 8)}.csv`;
    const csv = buildCampaignRecipientExportCsv(row, recipientStatus);
    return { filename, csv };
  }

  private async resolveRecipientExportStatuses(
    row: MailMarketingCampaignEntity,
    organizationId: string,
  ): Promise<
    Array<{
      email: string;
      musteriAdi?: string;
      referans?: string;
      status: string;
      error?: string;
    }>
  > {
    const failed = new Map(
      (row.result?.failed ?? []).map((item) => [
        item.email.trim().toLowerCase(),
        item.error,
      ]),
    );
    const output: Array<{
      email: string;
      musteriAdi?: string;
      referans?: string;
      status: string;
      error?: string;
    }> = [];
    for (const recipient of row.payload.recipients ?? []) {
      const email = recipient.email.trim().toLowerCase();
      let durum: string = row.status;
      let error: string | undefined;
      if (row.status === "scheduled") {
        durum = "zamanlandi";
      } else if (row.status === "cancelled") {
        durum = "iptal";
      } else if (row.status === "running") {
        durum = "gonderiliyor";
      } else if (failed.has(email)) {
        durum = "basarisiz";
        error = failed.get(email);
      } else if (
        row.status === "completed" &&
        (await this.emailSuppressionService.isSuppressed(
          email,
          organizationId,
        ))
      ) {
        durum = "durdurulmus";
      } else if (row.status === "completed") {
        durum = "gonderildi";
      } else if (row.status === "failed") {
        durum = "kampanya_basarisiz";
      }
      output.push({
        email: recipient.email,
        musteriAdi: recipient.musteriAdi,
        referans: recipient.referans,
        status: durum,
        error,
      });
    }
    return output;
  }

  public async resend(
    organizationId: string,
    campaignId: string,
    userId?: string,
  ): Promise<{
    campaignId: string;
    result: MailMarketingCampaignResult;
  }> {
    const source = await this.campaignRepository.findOne({
      where: { id: campaignId, organizationId },
    });
    if (!source) {
      throw new NotFoundException("Kampanya bulunamadı.");
    }
    const row = await this.campaignRepository.save(
      this.campaignRepository.create({
        organizationId,
        createdByUserId: userId ?? source.createdByUserId,
        subject: source.subject,
        status: "running",
        scheduleAt: null,
        startedAt: new Date(),
        payload: source.payload,
        result: null,
        errorMessage: null,
      }),
    );
    const result = await this.executeCampaignRow(row, userId);
    return { campaignId: row.id, result };
  }

  public async resendFailed(
    organizationId: string,
    campaignId: string,
    userId?: string,
  ): Promise<{
    campaignId: string;
    result: MailMarketingCampaignResult;
  }> {
    const source = await this.campaignRepository.findOne({
      where: { id: campaignId, organizationId },
    });
    if (!source) {
      throw new NotFoundException("Kampanya bulunamadı.");
    }
    const failedRows = source.result?.failed ?? [];
    if (failedRows.length === 0) {
      throw new BadRequestException("Yeniden gönderilecek başarısız alıcı yok.");
    }
    const failedEmails = new Set(
      failedRows.map((row) => row.email.trim().toLowerCase()),
    );
    const recipients = (source.payload.recipients ?? []).filter((row) =>
      failedEmails.has(row.email.trim().toLowerCase()),
    );
    if (recipients.length === 0) {
      throw new BadRequestException("Başarısız alıcı kaydı bulunamadı.");
    }
    const payload: MailMarketingCampaignPayload = {
      ...source.payload,
      recipients,
      reminderDispatchedAt: null,
    };
    const row = await this.campaignRepository.save(
      this.campaignRepository.create({
        organizationId,
        createdByUserId: userId ?? source.createdByUserId,
        subject: source.subject,
        status: "running",
        scheduleAt: null,
        startedAt: new Date(),
        payload,
        result: null,
        errorMessage: null,
      }),
    );
    const result = await this.executeCampaignRow(row, userId);
    return { campaignId: row.id, result };
  }

  public async cancelScheduled(
    organizationId: string,
    campaignId: string,
  ): Promise<void> {
    const existing = await this.campaignRepository.findOne({
      where: { id: campaignId, organizationId, status: "scheduled" },
    });
    if (!existing) {
      throw new NotFoundException(
        "Zamanlanmış kampanya bulunamadı veya iptal edilemez.",
      );
    }
    await this.campaignRepository.update(
      { id: campaignId, organizationId, status: "scheduled" },
      { status: "cancelled", completedAt: new Date() },
    );
    this.emitCampaignEvent(existing, "campaign.cancelled");
  }

  public async drainScheduled(): Promise<{ processed: number }> {
    const due = await this.campaignRepository.find({
      where: {
        status: "scheduled",
        scheduleAt: LessThanOrEqual(new Date()),
      },
      order: { scheduleAt: "ASC" },
      take: 5,
    });
    let processed = 0;
    for (const row of due) {
      const locked = await this.campaignRepository.findOne({
        where: { id: row.id, status: "scheduled" },
      });
      if (!locked) {
        continue;
      }
      await this.campaignRepository.update(
        { id: locked.id, status: "scheduled" },
        { status: "running", startedAt: new Date() },
      );
      try {
        await this.executeCampaignRow(locked, locked.createdByUserId ?? undefined);
        processed += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Kampanya başarısız";
        await this.campaignRepository.update(
          { id: locked.id },
          {
            status: "failed",
            completedAt: new Date(),
            errorMessage: message.slice(0, 500),
          },
        );
        this.emitCampaignEvent(locked, "campaign.failed", {
          errorMessage: message.slice(0, 500),
        });
        processed += 1;
      }
    }
    return { processed };
  }

  public async drainScheduleReminders(): Promise<{ processed: number }> {
    const rows = await this.campaignRepository.find({
      where: { status: "scheduled" },
      order: { scheduleAt: "ASC" },
      take: 20,
    });
    const now = Date.now();
    let processed = 0;
    for (const row of rows) {
      if (!row.scheduleAt || row.payload.reminderDispatchedAt) {
        continue;
      }
      const minutes = row.payload.reminderMinutesBefore;
      if (!minutes) {
        continue;
      }
      const fireAt = row.scheduleAt.getTime() - minutes * 60_000;
      if (now < fireAt || now >= row.scheduleAt.getTime()) {
        continue;
      }
      const payload = {
        ...row.payload,
        reminderDispatchedAt: new Date().toISOString(),
      };
      await this.campaignRepository.update(
        { id: row.id, status: "scheduled" },
        { payload },
      );
      const updated = { ...row, payload };
      this.emitCampaignEvent(updated, "campaign.reminder", {
        reminderMinutesBefore: minutes,
      });
      if (row.payload.notifyCreator && row.createdByUserId) {
        await this.notifyScheduledCreator(
          row.organizationId,
          row.createdByUserId,
          updated,
          "hatırlatma",
        );
      }
      processed += 1;
    }
    return { processed };
  }

  private async executeCampaignRow(
    row: MailMarketingCampaignEntity,
    userId?: string,
  ): Promise<MailMarketingCampaignResult> {
    this.emitCampaignEvent(row, "campaign.started");
    const attachments = row.payload.attachments as ComposeAttachmentInput[] | undefined;
    const sendResult = await this.mailMailboxComposeService.sendCampaign({
      organizationId: row.organizationId,
      userId,
      campaignId: row.id,
      subject: row.subject,
      text: row.payload.text,
      html: row.payload.html,
      attachments,
      recipients: row.payload.recipients,
      merge: row.payload.merge,
      delayMsBetweenRecipients: row.payload.delayMsBetweenRecipients,
      subjectB: row.payload.subjectB,
      recipientDomainAllowlist: row.payload.recipientDomainAllowlist,
      segment: row.payload.segment,
    });
    const result: MailMarketingCampaignResult = {
      attempted: sendResult.attempted,
      sent: sendResult.sent,
      skippedSuppressed: sendResult.skippedSuppressed,
      failed: sendResult.failed,
    };
    await this.campaignRepository.update(
      { id: row.id },
      {
        status: "completed",
        completedAt: new Date(),
        result,
        errorMessage:
          sendResult.failed.length > 0
            ? `${sendResult.failed.length} alıcı başarısız`
            : null,
      },
    );
    this.emitCampaignEvent(
      { ...row, result, status: "completed", completedAt: new Date() },
      "campaign.completed",
      { result },
    );
    return result;
  }

  private emitCampaignEvent(
    row: MailMarketingCampaignEntity,
    event:
      | "campaign.scheduled"
      | "campaign.reminder"
      | "campaign.started"
      | "campaign.completed"
      | "campaign.failed"
      | "campaign.cancelled",
    extra?: Record<string, unknown>,
  ): void {
    this.mailOrganizationWebhookDispatcherService.dispatch(
      row.organizationId,
      event,
      {
        campaignId: row.id,
        subject: row.subject,
        status: row.status,
        scheduleAt: row.scheduleAt?.toISOString() ?? null,
        recipientCount: row.payload.recipients?.length ?? 0,
        ...extra,
      },
    );
  }

  private async notifyScheduledCreator(
    organizationId: string,
    userId: string,
    row: MailMarketingCampaignEntity,
    kind: "zamanlandı" | "hatırlatma",
  ): Promise<void> {
    const user = await this.userAccountRepository.findOne({
      where: { id: userId },
    });
    const to = user?.emailAddress?.trim();
    if (!to) {
      return;
    }
    const when = row.scheduleAt?.toISOString() ?? "";
    const count = row.payload.recipients?.length ?? 0;
    const subjectLine =
      kind === "hatırlatma"
        ? `Kampanya hatırlatması: ${row.subject}`
        : `Kampanya zamanlandı: ${row.subject}`;
    const text = [
      "Merhaba,",
      "",
      kind === "hatırlatma"
        ? "Planlanmış kampanyanızın gönderim zamanı yaklaşıyor."
        : "Kampanyanız zamanlandı.",
      "",
      `Konu: ${row.subject}`,
      row.payload.subjectB ? `A/B konu (B): ${row.payload.subjectB}` : "",
      `Alıcı sayısı: ${count}`,
      `Gönderim: ${when}`,
      "",
      "Kampanyayı web posta → Kampanya geçmişi üzerinden iptal edebilirsiniz.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await this.mailMailboxComposeService.compose({
        organizationId,
        userId,
        to,
        subject: subjectLine,
        text,
      });
    } catch {
      // Bildirim başarısızlığı kampanyayı engellemez.
    }
  }

  private toListItem(row: MailMarketingCampaignEntity) {
    return {
      id: row.id,
      subject: row.subject,
      tags: row.payload.tags ?? [],
      status: row.status,
      scheduleAt: row.scheduleAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      recipientCount: row.payload.recipients?.length ?? 0,
      failedRecipientCount: row.result?.failed?.length ?? 0,
      result: row.result,
      errorMessage: row.errorMessage,
    };
  }

  private buildComposeFromRow(row: MailMarketingCampaignEntity) {
    return {
      subject: row.subject,
      subjectB: row.payload.subjectB ?? undefined,
      text: row.payload.text,
      html: row.payload.html,
      recipients: row.payload.recipients ?? [],
      merge: row.payload.merge,
      delayMsBetweenRecipients: row.payload.delayMsBetweenRecipients,
      recipientDomainAllowlist: row.payload.recipientDomainAllowlist,
      segment: row.payload.segment,
      notifyCreator: row.payload.notifyCreator,
      reminderMinutesBefore: row.payload.reminderMinutesBefore,
      tags: row.payload.tags,
    };
  }

  private toDetail(row: MailMarketingCampaignEntity) {
    return {
      ...this.toListItem(row),
      subjectB: row.payload.subjectB ?? null,
      segment: row.payload.segment ?? null,
      recipientDomainAllowlist: row.payload.recipientDomainAllowlist ?? null,
      reminderMinutesBefore: row.payload.reminderMinutesBefore ?? null,
      reminderDispatchedAt: row.payload.reminderDispatchedAt ?? null,
      notifyCreator: row.payload.notifyCreator ?? false,
      tags: row.payload.tags ?? [],
      recipients: row.payload.recipients ?? [],
      payloadSummary: {
        hasHtml: Boolean(row.payload.html?.trim()),
        textLength: row.payload.text?.length ?? 0,
        attachmentCount: row.payload.attachments?.length ?? 0,
        delayMsBetweenRecipients: row.payload.delayMsBetweenRecipients ?? 0,
      },
      mergeDefaults: row.payload.merge ?? null,
    };
  }
}
