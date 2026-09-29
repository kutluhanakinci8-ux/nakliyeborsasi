import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";

@Injectable()
export class MessagingRetentionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingRetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageThreadEntity)
    private readonly threadRepository: Repository<MessageThreadEntity>,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.MESSAGING_RETENTION_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.MESSAGING_RETENTION_JOB_INTERVAL_MS ?? `${6 * 60 * 60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.runSweep().catch((error) => {
        this.logger.warn(
          `Retention sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.runSweep();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async runSweep(): Promise<void> {
    const settings = await this.settingsRepository.find({
      where: {},
    });
    for (const row of settings) {
      if (!row.retentionDays || row.retentionDays < 30) {
        continue;
      }
      const cutoff = new Date(
        Date.now() - row.retentionDays * 24 * 60 * 60 * 1000,
      );
      const threads = await this.threadRepository
        .createQueryBuilder("thread")
        .where(
          "(thread.companyAId = :companyId OR thread.companyBId = :companyId)",
          { companyId: row.companyId },
        )
        .andWhere("thread.legal_hold_at IS NULL")
        .getMany();
      const threadIds = threads.map((thread) => thread.id);
      if (threadIds.length === 0) {
        continue;
      }
      const qb = this.messageRepository
        .createQueryBuilder("message")
        .where("message.threadId IN (:...threadIds)", { threadIds })
        .andWhere("message.createdAt < :cutoff", { cutoff })
        .take(500);
      if (row.retentionMode === "archive") {
        qb.andWhere("message.deletedAt IS NULL");
      }
      const filtered = await qb.getMany();
      if (filtered.length === 0) {
        continue;
      }
      if (row.retentionMode === "delete") {
        await this.messageRepository.remove(filtered);
      } else {
        for (const message of filtered) {
          message.deletedAt = message.deletedAt ?? new Date();
          message.bodyText = "[arşiv — saklama politikası]";
        }
        await this.messageRepository.save(filtered);
      }
      this.logger.log(
        `Retention ${row.retentionMode} company=${row.companyId} messages=${filtered.length}`,
      );
    }
  }
}
