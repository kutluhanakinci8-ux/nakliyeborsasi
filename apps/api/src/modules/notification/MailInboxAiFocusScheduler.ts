import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailInboxAiFocusBackgroundService } from "./MailInboxAiFocusBackgroundService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_AI_FOCUS_INTERVAL_MS?.trim();
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
export class MailInboxAiFocusScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailInboxAiFocusScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailInboxAiFocusBackgroundService: MailInboxAiFocusBackgroundService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("AI focus scheduler kapalı (runtime role)");
      return;
    }
    if (process.env.MAIL_AI_FOCUS_SCHEDULER_ENABLED === "false") {
      this.logger.log("AI focus scheduler env ile kapalı");
      return;
    }
    const intervalMs = readIntervalMs();
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(
      `AI focus lane scheduler aktif (${Math.round(intervalMs / 60_000)} dk).`,
    );
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
        await this.mailInboxAiFocusBackgroundService.runClassificationCycle(
          30,
        );
      if (result.updated > 0) {
        this.logger.log(
          `AI focus classified updated=${result.updated} skipped=${result.skipped}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : "ai focus tick failed",
      );
    }
  }
}
