import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class MailTenantDnsVerificationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailTenantDnsVerificationScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log(
        `LERTA_MAIL_RUNTIME_ROLE=${this.mailRuntimeRoleService.getRole()} — tenant DNS scheduler kapalı`,
      );
      return;
    }
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      return;
    }
    void this.tick().catch((error) => {
      this.logger.warn(
        `İlk tenant DNS senkronu başarısız: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
    this.timer = setInterval(() => {
      void this.tick().catch((error) => {
        this.logger.warn(
          `Tenant DNS senkronu: ${
            error instanceof Error ? error.message : String(error)
          }`,
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
    const result =
      await this.mailTenantSubdomainService.syncTenantDomainVerificationFromDns();
    if (!result.dnsOk) {
      this.logger.debug(
        `Tenant DNS henüz hazır değil (${result.domain})`,
      );
    }
  }
}
