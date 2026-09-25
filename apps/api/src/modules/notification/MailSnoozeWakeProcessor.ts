import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailWebPushService } from "./MailWebPushService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const INTERVAL_MS = 60_000;
const WAKE_WINDOW_MS = 120_000;

@Injectable()
export class MailSnoozeWakeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailSnoozeWakeProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    private readonly mailWebPushService: MailWebPushService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        this.logger.warn(
          error instanceof Error ? error.message : "snooze wake tick failed",
        );
      });
    }, INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WAKE_WINDOW_MS);
    const rows = await this.inboundRepository.find({
      where: {
        snoozedUntil: Between(windowStart, now),
      },
      take: 50,
    });
    for (const row of rows) {
      if (!row.snoozedUntil || row.snoozedUntil > now) {
        continue;
      }
      const mailbox = await this.mailboxRepository.findOne({
        where: { id: row.mailboxId },
      });
      if (!mailbox) {
        continue;
      }
      await this.mailWebPushService.notifySnoozeEnded({
        organizationId: mailbox.organizationId,
        messageId: row.id,
        subject: row.subject,
      });
      row.snoozedUntil = null;
      await this.inboundRepository.save(row);
    }
  }
}
