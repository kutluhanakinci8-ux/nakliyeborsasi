import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailInboxDigestService } from "./MailInboxDigestService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class MailInboxDigestScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailInboxDigestScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailInboxDigestService: MailInboxDigestService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("Inbox digest scheduler kapalı (runtime role)");
      return;
    }
    void this.tick();
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      const result = await this.mailInboxDigestService.runDigestWindow();
      if (result.sent > 0) {
        this.logger.log(`Günlük özet gönderildi: ${result.sent} organizasyon`);
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : "digest tick failed",
      );
    }
  }
}
