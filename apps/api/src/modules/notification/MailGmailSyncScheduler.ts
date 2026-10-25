import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailGmailSyncService } from "./MailGmailSyncService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_GMAIL_SYNC_INTERVAL_MS?.trim();
  if (!raw) {
    return DEFAULT_INTERVAL_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 60_000) {
    return DEFAULT_INTERVAL_MS;
  }
  return parsed;
}

@Injectable()
export class MailGmailSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailGmailSyncScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly accountRepository: Repository<MailGmailSyncAccountEntity>,
    private readonly mailGmailSyncService: MailGmailSyncService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("Gmail sync scheduler kapalı (runtime role)");
      return;
    }
    const intervalMs = readIntervalMs();
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(
      `Gmail senkron zamanlayıcısı aktif (${Math.round(intervalMs / 60_000)} dk).`,
    );
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const accounts = await this.accountRepository.find({
      where: { enabled: true },
      take: 200,
    });
    for (const account of accounts) {
      try {
        await this.mailGmailSyncService.syncAccount(
          account.organizationId,
          account.id,
          null,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "gmail_sync_failed";
        this.logger.warn(
          `Gmail background sync failed org=${account.organizationId} account=${account.id}: ${message}`,
        );
      }
    }
  }
}
