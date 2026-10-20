import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailDelayedComposeService } from "./MailDelayedComposeService";
import { MailMarketingCampaignService } from "./MailMarketingCampaignService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DRAIN_INTERVAL_MS = 1000;

@Injectable()
export class MailDelayedComposeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailDelayedComposeProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailDelayedComposeService: MailDelayedComposeService,
    private readonly mailMarketingCampaignService: MailMarketingCampaignService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("Delayed compose processor kapalı (runtime role)");
      return;
    }
    this.timer = setInterval(() => {
      void this.mailDelayedComposeService.drainDue().catch((error) => {
        this.logger.warn(
          error instanceof Error ? error.message : "delayed compose drain failed",
        );
      });
      void this.mailMarketingCampaignService.drainScheduled().catch((error) => {
        this.logger.warn(
          error instanceof Error ? error.message : "scheduled campaign drain failed",
        );
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
