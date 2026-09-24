import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { EmailOutboxService } from "./EmailOutboxService";
import { EmailOutboxOperationsService } from "./EmailOutboxOperationsService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

const DRAIN_INTERVAL_MS = 30_000;

@Injectable()
export class EmailOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailOutboxOperationsService: EmailOutboxOperationsService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public onModuleInit(): void {
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      this.logger.warn("EMAIL_ENABLED=false — outbox processor kapalı");
      return;
    }
    void this.runDrain("startup");
    this.timer = setInterval(() => {
      void this.runDrain("interval");
    }, DRAIN_INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runDrain(reason: string): Promise<void> {
    try {
      const result = await this.emailOutboxService.drainQueue();
      this.emailOutboxOperationsService.recordDrain(result);
      if (result.failed > 0) {
        this.logger.warn(
          `Outbox drain (${reason}): processed=${result.processed} sent=${result.sent} failed=${result.failed}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Outbox drain failed";
      this.emailOutboxOperationsService.recordDrainError(message);
      this.logger.error(`Outbox drain başarısız (${reason})`, error);
    }
  }
}
