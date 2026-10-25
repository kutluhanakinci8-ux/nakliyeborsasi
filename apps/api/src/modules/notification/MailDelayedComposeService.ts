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

const MAX_DELAY_SECONDS = 30;
const DEFAULT_DELAY_SECONDS = 5;
const MAX_SCHEDULE_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;

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

  public async scheduleAt(
    organizationId: string,
    payload: MailDelayedSendPayload,
    sendAt: Date,
  ): Promise<{ id: string; sendAt: string }> {
    const now = Date.now();
    if (sendAt.getTime() < now + 60_000) {
      throw new BadRequestException(
        "Zamanlanmış gönderim en az 1 dakika sonrası olmalı.",
      );
    }
    if (sendAt.getTime() > now + MAX_SCHEDULE_AHEAD_MS) {
      throw new BadRequestException(
        "Zamanlanmış gönderim en fazla 90 gün sonrası olabilir.",
      );
    }
    const row = await this.delayedRepository.save(
      this.delayedRepository.create({
        organizationId,
        status: "pending",
        sendAfter: sendAt,
        payload,
        sentId: null,
        errorMessage: null,
      }),
    );
    return { id: row.id, sendAt: sendAt.toISOString() };
  }

  public async listPendingForOrganization(
    organizationId: string,
    userId?: string,
    limit = 30,
  ): Promise<
    Array<{
      id: string;
      sendAt: string;
      status: MailDelayedComposeEntity["status"];
      kind: string;
      summary: string;
    }>
  > {
    const rows = await this.delayedRepository.find({
      where: { organizationId, status: "pending" },
      order: { sendAfter: "ASC" },
      take: Math.min(limit, 50),
    });
    return rows
      .filter((row) => {
        if (!userId) {
          return true;
        }
        const payload = row.payload;
        if (this.isLegacyCompose(payload)) {
          return true;
        }
        return "userId" in payload && payload.userId === userId;
      })
      .map((row) => {
        const payload = row.payload;
        let kind = "compose";
        let summary = "Gönderim";
        if (this.isLegacyCompose(payload)) {
          summary = payload.subject;
        } else {
          const send = payload as MailDelayedSendPayload;
          kind = send.kind;
          if (send.kind === "compose") {
            summary = send.subject;
          } else if (send.kind === "reply") {
            summary = "Yanıt";
          } else if (send.kind === "forward") {
            summary = `İleti → ${send.to}`;
          } else if (send.kind === "draft_send") {
            summary = "Taslaktan gönderim";
          }
        }
        return {
          id: row.id,
          sendAt: row.sendAfter.toISOString(),
          status: row.status,
          kind,
          summary,
        };
      });
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
        userId: send.userId,
        inboundMessageId: send.inboundMessageId,
        text: send.text,
        cc: send.cc,
        bcc: send.bcc,
        replyAll: send.replyAll,
        attachments: send.attachments,
        merge: send.merge,
        connectedSendProvider: send.connectedSendProvider,
        connectedSendAccountId: send.connectedSendAccountId,
      });
    }
    if (send.kind === "forward") {
      return this.mailMailboxComposeService.forward({
        organizationId,
        userId: send.userId,
        inboundMessageId: send.inboundMessageId,
        to: send.to,
        text: send.text,
        includeOriginal: send.includeOriginal,
        attachments: send.attachments,
        merge: send.merge,
        connectedSendProvider: send.connectedSendProvider,
        connectedSendAccountId: send.connectedSendAccountId,
      });
    }
    if (send.kind === "compose") {
      return this.mailMailboxComposeService.compose({
        organizationId,
        userId: send.userId,
        to: send.to,
        cc: send.cc,
        bcc: send.bcc,
        subject: send.subject,
        text: send.text,
        html: send.html,
        attachments: send.attachments,
        merge: send.merge,
        connectedSendProvider: send.connectedSendProvider,
        connectedSendAccountId: send.connectedSendAccountId,
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
        userId: send.userId,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        attachments: payload.attachments,
        connectedSendProvider: payload.connectedSendProvider,
        connectedSendAccountId: payload.connectedSendAccountId,
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
