import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { TrustReviewReminderService } from "./TrustReviewReminderService";

@Injectable()
export class TrustReviewReminderSweepTask implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly trustReviewReminderService: TrustReviewReminderService,
  ) {}

  public onModuleInit(): void {
    const intervalMs = Number(
      process.env.TRUST_REVIEW_REMINDER_INTERVAL_MS ?? 3_600_000,
    );
    this.timer = setInterval(() => {
      void this.trustReviewReminderService.runSweep();
    }, intervalMs);
    void this.trustReviewReminderService.runSweep();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
