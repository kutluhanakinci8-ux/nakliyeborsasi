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
} from "../../infrastructure/database/entities/MailDelayedComposeEntity";
import { MailMailboxComposeService } from "./MailMailboxComposeService";

const MAX_DELAY_SECONDS = 10;
const DEFAULT_DELAY_SECONDS = 5;

@Injectable()
export class MailDelayedComposeService {
  public constructor(
    @InjectRepository(MailDelayedComposeEntity)
    private readonly delayedRepository: Repository<MailDelayedComposeEntity>,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
  ) {}

  public async schedule(
    organizationId: string,
    payload: MailDelayedComposePayload,
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
        const result = await this.mailMailboxComposeService.compose({
          organizationId: stillPending.organizationId,
          ...stillPending.payload,
        });
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
