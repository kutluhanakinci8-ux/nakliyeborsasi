import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SocialHubTokenRefreshService } from "./oauth/SocialHubTokenRefreshService";

@Injectable()
export class SocialHubTokenRefreshScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialHubTokenRefreshScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly tokenRefreshService: SocialHubTokenRefreshService,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.SOCIAL_TOKEN_REFRESH_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.SOCIAL_TOKEN_REFRESH_JOB_INTERVAL_MS ?? `${6 * 60 * 60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.runRefreshSweep().catch((error) => {
        this.logger.warn(
          `Token refresh sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.runRefreshSweep();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runRefreshSweep(): Promise<void> {
    const count = await this.tokenRefreshService.refreshExpiringConnections();
    if (count > 0) {
      this.logger.log(`Auto-refreshed ${count} social channel token(s).`);
    }
  }
}
