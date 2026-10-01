import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SocialHubRoadmapTokenRefreshService } from "./oauth/SocialHubRoadmapTokenRefreshService";

@Injectable()
export class SocialHubRoadmapTokenRefreshScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SocialHubRoadmapTokenRefreshScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly roadmapTokenRefreshService: SocialHubRoadmapTokenRefreshService,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.SOCIAL_ROADMAP_TOKEN_REFRESH_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.SOCIAL_ROADMAP_TOKEN_REFRESH_JOB_INTERVAL_MS ??
        `${3 * 60 * 60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.runSweep().catch((error) => {
        this.logger.warn(
          `Roadmap token refresh sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, intervalMs);
    void this.runSweep();
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runSweep(): Promise<void> {
    const count =
      await this.roadmapTokenRefreshService.refreshExpiringRoadmapConnections();
    if (count > 0) {
      this.logger.log(`Auto-refreshed ${count} roadmap beta token(s).`);
    }
  }
}
