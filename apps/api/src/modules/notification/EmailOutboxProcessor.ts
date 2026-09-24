import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { EmailOutboxService } from "./EmailOutboxService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

const DRAIN_INTERVAL_MS = 30_000;

@Injectable()
export class EmailOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public onModuleInit(): void {
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      this.logger.warn("EMAIL_ENABLED=false — outbox processor kapalı");
      return;
    }
    void this.emailOutboxService.drainQueue().catch((error) => {
      this.logger.error("İlk outbox drain başarısız", error);
    });
    this.timer = setInterval(() => {
      void this.emailOutboxService.drainQueue().catch((error) => {
        this.logger.error("Outbox drain başarısız", error);
      });
    }, DRAIN_INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
