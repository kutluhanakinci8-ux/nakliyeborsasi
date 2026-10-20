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

const MAX_SCHEDULE_DAYS = 7;
const MIN_SCHEDULE_LEAD_MS = 60_000;

@Injectable()
export class MailMarketingCampaignService {
  public constructor(
    @InjectRepository(MailMarketingCampaignEntity)
    private readonly campaignRepository: Repository<MailMarketingCampaignEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
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
      if (params.payload.notifyCreator && params.userId) {
        await this.notifyScheduledCreator(
          params.organizationId,
          params.userId,
          row,
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

  public async listForOrganization(organizationId: string, limit = 40) {
    const rows = await this.campaignRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
      take: Math.min(80, Math.max(1, limit)),
    });
    return rows.map((row) => this.toListItem(row));
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

  public async cancelScheduled(
    organizationId: string,
    campaignId: string,
  ): Promise<void> {
    const updated = await this.campaignRepository.update(
      { id: campaignId, organizationId, status: "scheduled" },
      { status: "cancelled", completedAt: new Date() },
    );
    if (!updated.affected) {
      throw new NotFoundException(
        "Zamanlanmış kampanya bulunamadı veya iptal edilemez.",
      );
    }
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
        processed += 1;
      }
    }
    return { processed };
  }

  private async executeCampaignRow(
    row: MailMarketingCampaignEntity,
    userId?: string,
  ): Promise<MailMarketingCampaignResult> {
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
    return result;
  }

  private async notifyScheduledCreator(
    organizationId: string,
    userId: string,
    row: MailMarketingCampaignEntity,
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
    const subjectLine = `Kampanya zamanlandı: ${row.subject}`;
    const text = [
      "Merhaba,",
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
      status: row.status,
      scheduleAt: row.scheduleAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      recipientCount: row.payload.recipients?.length ?? 0,
      result: row.result,
      errorMessage: row.errorMessage,
    };
  }
}
