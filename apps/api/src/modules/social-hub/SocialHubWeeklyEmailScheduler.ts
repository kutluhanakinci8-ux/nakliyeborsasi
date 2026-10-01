import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SocialHubWeeklyEmailService } from "./SocialHubWeeklyEmailService";

@Injectable()
export class SocialHubWeeklyEmailScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialHubWeeklyEmailScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly weeklyEmailService: SocialHubWeeklyEmailService,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.SOCIAL_WEEKLY_EMAIL_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.SOCIAL_WEEKLY_EMAIL_JOB_INTERVAL_MS ?? `${12 * 60 * 60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.run().catch((error) => {
        this.logger.warn(
          `Weekly email sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.run();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async run(): Promise<void> {
    const count = await this.weeklyEmailService.runSweep();
    if (count > 0) {
      this.logger.log(`Social hub weekly emails sent: ${count}`);
    }
  }
}
