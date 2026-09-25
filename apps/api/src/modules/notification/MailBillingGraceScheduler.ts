import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailSubscriptionLifecycleService } from "./MailSubscriptionLifecycleService";

const INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class MailBillingGraceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailBillingGraceScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailSubscriptionLifecycleService: MailSubscriptionLifecycleService,
  ) {}

  public onModuleInit(): void {
    void this.tick().catch((error) => {
      this.logger.warn(
        `İlk grace taraması: ${error instanceof Error ? error.message : error}`,
      );
    });
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        this.logger.warn(
          `Grace taraması: ${error instanceof Error ? error.message : error}`,
        );
      });
    }, INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const count =
      await this.mailSubscriptionLifecycleService.processAllGraceExpiries();
    if (count > 0) {
      this.logger.log(`Grace süresi dolan ${count} tenant Pilot plana alındı.`);
    }
  }
}
