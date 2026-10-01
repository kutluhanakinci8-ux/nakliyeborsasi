import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SocialHubSlackDigestService } from "./SocialHubSlackDigestService";

@Injectable()
export class SocialHubSlackDigestScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialHubSlackDigestScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly digestService: SocialHubSlackDigestService,
  ) {}

  public onModuleInit(): void {
    const enabled = process.env.SOCIAL_SLACK_DIGEST_JOB_ENABLED !== "0";
    if (!enabled) {
      return;
    }
    const intervalMs = Number.parseInt(
      process.env.SOCIAL_SLACK_DIGEST_JOB_INTERVAL_MS ?? `${60 * 60 * 1000}`,
      10,
    );
    this.timer = setInterval(() => {
      void this.run().catch((error) => {
        this.logger.warn(
          `Slack digest sweep failed: ${
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
    const count = await this.digestService.runSweep();
    if (count > 0) {
      this.logger.log(`Social hub Slack daily digests sent: ${count}`);
    }
  }
}
