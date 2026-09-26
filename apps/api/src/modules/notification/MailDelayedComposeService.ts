import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import {
  MailDelayedComposeEntity,
  MailDelayedComposePayload,
  MailDelayedSendPayload,
  MailDelayedStoredPayload,
} from "../../infrastructure/database/entities/MailDelayedComposeEntity";
import { MailMailboxComposeService } from "./MailMailboxComposeService";
import { MailComposeDraftService } from "./MailComposeDraftService";

const MAX_DELAY_SECONDS = 10;
const DEFAULT_DELAY_SECONDS = 5;

@Injectable()
export class MailDelayedComposeService {
  public constructor(
    @InjectRepository(MailDelayedComposeEntity)
    private readonly delayedRepository: Repository<MailDelayedComposeEntity>,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    private readonly mailComposeDraftService: MailComposeDraftService,
  ) {}

  public async schedule(
    organizationId: string,
    payload: MailDelayedSendPayload,
    delaySeconds?: number,
  ): Promise<{ id: string; sendAt: string }> {
    const seconds = this.normalizeDelay(delaySeconds);
    const sendAfter = new Date(Date.now() + seconds * 1000);
    const row = await this.delayedRepository.save(
      this.delayedRepository.create({
        organizationId,
        status: "pending",
        sendAfter,
        payload,
        sentId: null,
        errorMessage: null,
      }),
    );
    return { id: row.id, sendAt: sendAfter.toISOString() };
  }

  public async getStatus(
    organizationId: string,
    pendingId: string,
  ): Promise<{
    status: MailDelayedComposeEntity["status"];
    errorMessage: string | null;
    sentId: string | null;
  }> {
    const row = await this.delayedRepository.findOne({
      where: { id: pendingId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Bekleyen gönderim bulunamadı.");
    }
    return {
      status: row.status,
      errorMessage: row.errorMessage,
      sentId: row.sentId,
    };
  }

  public async cancel(organizationId: string, pendingId: string): Promise<void> {
    const result = await this.delayedRepository.update(
      { id: pendingId, organizationId, status: "pending" },
      { status: "cancelled" },
    );
    if (!result.affected) {
      throw new NotFoundException(
        "Bekleyen gönderim bulunamadı veya iptal edilemez.",
      );
    }
  }

  public async drainDue(): Promise<{ processed: number }> {
    const due = await this.delayedRepository.find({
      where: {
        status: "pending",
        sendAfter: LessThanOrEqual(new Date()),
      },
      order: { sendAfter: "ASC" },
      take: 20,
    });
    let processed = 0;
    for (const row of due) {
      const stillPending = await this.delayedRepository.findOne({
        where: { id: row.id, status: "pending" },
      });
      if (!stillPending) {
        continue;
      }
      try {
        const result = await this.dispatchSend(
          stillPending.organizationId,
          stillPending.payload,
        );
        const updated = await this.delayedRepository.update(
          { id: stillPending.id, status: "pending" },
          { status: "sent", sentId: result.sentId },
        );
        if (updated.affected) {
          processed += 1;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gönderim başarısız";
        await this.delayedRepository.update(
          { id: stillPending.id, status: "pending" },
          { status: "failed", errorMessage: message.slice(0, 500) },
        );
        processed += 1;
      }
    }
    return { processed };
  }

  private async dispatchSend(
    organizationId: string,
    payload: MailDelayedStoredPayload,
  ): Promise<{ sentId: string; smtpMessageId: string | null }> {
    if (this.isLegacyCompose(payload)) {
      return this.mailMailboxComposeService.compose({
        organizationId,
        ...payload,
      });
    }
    const send = payload as MailDelayedSendPayload;
    if (send.kind === "reply") {
      return this.mailMailboxComposeService.reply({
        organizationId,
        inboundMessageId: send.inboundMessageId,
        text: send.text,
        cc: send.cc,
        bcc: send.bcc,
        replyAll: send.replyAll,
        attachments: send.attachments,
      });
    }
    if (send.kind === "forward") {
      return this.mailMailboxComposeService.forward({
        organizationId,
        inboundMessageId: send.inboundMessageId,
        to: send.to,
        text: send.text,
        includeOriginal: send.includeOriginal,
        attachments: send.attachments,
      });
    }
    if (send.kind === "compose") {
      return this.mailMailboxComposeService.compose({
        organizationId,
        to: send.to,
        cc: send.cc,
        bcc: send.bcc,
        subject: send.subject,
        text: send.text,
        html: send.html,
        attachments: send.attachments,
      });
    }
    if (send.kind === "draft_send") {
      const payload = await this.mailComposeDraftService.getForSend(
        organizationId,
        send.userId,
        send.draftId,
      );
      const result = await this.mailMailboxComposeService.compose({
        organizationId,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        attachments: payload.attachments,
      });
      await this.mailComposeDraftService.deleteAfterSend(
        organizationId,
        send.userId,
        send.draftId,
      );
      return result;
    }
    throw new BadRequestException("Geçersiz bekleyen gönderim türü.");
  }

  private isLegacyCompose(
    payload: MailDelayedStoredPayload,
  ): payload is MailDelayedComposePayload {
    if ("kind" in payload && payload.kind !== undefined) {
      return false;
    }
    return "to" in payload && "subject" in payload;
  }

  private normalizeDelay(delaySeconds?: number): number {
    const value =
      delaySeconds === undefined || delaySeconds === null
        ? DEFAULT_DELAY_SECONDS
        : delaySeconds;
    if (!Number.isFinite(value) || value < 1 || value > MAX_DELAY_SECONDS) {
      throw new BadRequestException(
        `Gecikme 1–${MAX_DELAY_SECONDS} saniye olmalı.`,
      );
    }
    return Math.floor(value);
  }
}
