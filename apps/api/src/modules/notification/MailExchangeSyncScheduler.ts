import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_EXCHANGE_SYNC_INTERVAL_MS?.trim();
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
export class MailExchangeSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailExchangeSyncScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly accountRepository: Repository<MailExchangeSyncAccountEntity>,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("Exchange sync scheduler kapalı (runtime role)");
      return;
    }
    const intervalMs = readIntervalMs();
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(
      `Exchange Graph senkron zamanlayıcısı aktif (${Math.round(intervalMs / 60_000)} dk).`,
    );
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.mailExchangeGraphSyncService.isConfigured()) {
      return;
    }
    const accounts = await this.accountRepository.find({
      where: { enabled: true },
      take: 40,
      order: { lastSyncedAt: "ASC" },
    });
    for (const account of accounts) {
      try {
        await this.mailExchangeGraphSyncService.syncAccount(
          account.organizationId,
          account.id,
          null,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "exchange_sync_failed";
        this.logger.warn(
          `Scheduled Exchange sync skipped for ${account.id}: ${message}`,
        );
      }
    }
  }
}
