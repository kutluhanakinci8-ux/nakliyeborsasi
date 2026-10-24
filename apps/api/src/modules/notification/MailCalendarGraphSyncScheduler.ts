import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCalendarGraphAccountEntity } from "../../infrastructure/database/entities/MailCalendarGraphAccountEntity";
import { MailCalendarGraphSyncService } from "./MailCalendarGraphSyncService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class MailCalendarGraphSyncScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailCalendarGraphSyncScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(MailCalendarGraphAccountEntity)
    private readonly accountRepository: Repository<MailCalendarGraphAccountEntity>,
    private readonly mailCalendarGraphSyncService: MailCalendarGraphSyncService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      return;
    }
    this.timer = setInterval(() => void this.tick(), DEFAULT_INTERVAL_MS);
    this.logger.log("Graph takvim senkron zamanlayıcısı aktif (30 dk).");
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.mailCalendarGraphSyncService.isConfigured()) {
      return;
    }
    const accounts = await this.accountRepository.find({
      where: { enabled: true },
      take: 40,
      order: { lastSyncedAt: "ASC" },
    });
    for (const account of accounts) {
      try {
        await this.mailCalendarGraphSyncService.syncAccount(
          account.organizationId,
          account.id,
          null,
        );
      } catch (error) {
        this.logger.warn(
          `Scheduled Graph calendar sync skipped for ${account.id}: ${
            error instanceof Error ? error.message : "sync_failed"
          }`,
        );
      }
    }
  }
}
