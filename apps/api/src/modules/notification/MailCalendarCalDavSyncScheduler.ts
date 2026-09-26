import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailCalendarCalDavService } from "./MailCalendarCalDavService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_CALENDAR_CALDAV_SYNC_INTERVAL_MS?.trim();
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
export class MailCalendarCalDavSyncScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailCalendarCalDavSyncScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailCalendarCalDavService: MailCalendarCalDavService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("CalDAV sync scheduler kapalı (runtime role)");
      return;
    }
    const intervalMs = readIntervalMs();
    this.logger.log(
      `CalDAV sync scheduler başlatıldı (aralık ${Math.round(intervalMs / 60_000)} dk)`,
    );
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      const result =
        await this.mailCalendarCalDavService.syncAllEnabledInBackground();
      if (result.accounts > 0) {
        this.logger.log(
          `CalDAV senkron: ${result.succeeded} başarılı, ${result.failed} hata (${result.accounts} hesap)`,
        );
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : "CalDAV sync tick failed",
      );
    }
  }
}
