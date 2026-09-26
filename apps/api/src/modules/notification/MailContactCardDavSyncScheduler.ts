import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailContactCardDavService } from "./MailContactCardDavService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_CONTACT_CARDDAV_SYNC_INTERVAL_MS?.trim();
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
export class MailContactCardDavSyncScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailContactCardDavSyncScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailContactCardDavService: MailContactCardDavService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("CardDAV sync scheduler kapalı (runtime role)");
      return;
    }
    const intervalMs = readIntervalMs();
    this.logger.log(
      `CardDAV sync scheduler başlatıldı (aralık ${Math.round(intervalMs / 60_000)} dk)`,
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
        await this.mailContactCardDavService.syncAllEnabledInBackground();
      if (result.accounts > 0) {
        this.logger.log(
          `CardDAV senkron: ${result.succeeded} başarılı, ${result.failed} hata (${result.accounts} hesap)`,
        );
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : "CardDAV sync tick failed",
      );
    }
  }
}
