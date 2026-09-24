import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import {
  EmailOutboxOperationsService,
  type EmailOutboxOperationsSnapshot,
} from "./EmailOutboxOperationsService";

export type EmailDeliveryHealthSnapshot = {
  emailEnabled: boolean;
  smtpProfile: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpAuthConfigured: boolean;
  smtpFrom: string;
  webPublicBaseUrl: string;
  defaultAdminRecipients: string[];
  deliveryMode: "mailpit" | "custom";
  lastVerifyOk: boolean | null;
  lastVerifyError: string | null;
  lastVerifiedAt: string | null;
  outboxOperations: EmailOutboxOperationsSnapshot;
  smtpPeriodicVerifyEnabled: boolean;
  nextPeriodicVerifyHintTr: string;
};

const SMTP_VERIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class EmailDeliveryHealthService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EmailDeliveryHealthService.name);
  private lastVerifyOk: boolean | null = null;
  private lastVerifyError: string | null = null;
  private lastVerifiedAt: Date | null = null;
  private verifyTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly emailOutboxOperationsService: EmailOutboxOperationsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      return;
    }
    try {
      await this.verifySmtpConnection();
    } catch (error) {
      this.logger.warn(
        `SMTP doğrulama başarısız: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    this.verifyTimer = setInterval(() => {
      void this.verifySmtpConnection().catch((error) => {
        const message =
          error instanceof Error ? error.message : String(error);
        this.captureVerifyFailure(message);
        this.logger.warn(`Periyodik SMTP doğrulama başarısız: ${message}`);
      });
    }, SMTP_VERIFY_INTERVAL_MS);
  }

  public onModuleDestroy(): void {
    if (this.verifyTimer) {
      clearInterval(this.verifyTimer);
      this.verifyTimer = null;
    }
  }

  public async verifySmtpConnection(): Promise<void> {
    const transport = nodemailer.createTransport(
      this.notificationConfigurationService.resolveSmtpTransportOptions(),
    );
    await transport.verify();
    this.lastVerifyOk = true;
    this.lastVerifyError = null;
    this.lastVerifiedAt = new Date();
  }

  public captureVerifyFailure(message: string): void {
    this.lastVerifyOk = false;
    this.lastVerifyError = message;
    this.lastVerifiedAt = new Date();
  }

  public getSnapshot(): EmailDeliveryHealthSnapshot {
    const smtp = this.notificationConfigurationService.resolveSmtpConfig();
    const profile = this.notificationConfigurationService.resolveSmtpProfile();
    return {
      emailEnabled: this.notificationConfigurationService.isEmailEnabled(),
      smtpProfile: profile,
      smtpHost: smtp.host,
      smtpPort: smtp.port,
      smtpSecure: smtp.secure,
      smtpAuthConfigured: Boolean(smtp.user && smtp.pass),
      smtpFrom: smtp.from,
      webPublicBaseUrl:
        this.notificationConfigurationService.resolveWebBaseUrl(),
      defaultAdminRecipients:
        this.notificationConfigurationService.resolveDefaultAdminRecipients(),
      deliveryMode: this.notificationConfigurationService.resolveDeliveryMode(),
      lastVerifyOk: this.lastVerifyOk,
      lastVerifyError: this.lastVerifyError,
      lastVerifiedAt: this.lastVerifiedAt?.toISOString() ?? null,
      outboxOperations: this.emailOutboxOperationsService.getSnapshot(),
      smtpPeriodicVerifyEnabled:
        this.notificationConfigurationService.isEmailEnabled(),
      nextPeriodicVerifyHintTr:
        "SMTP bağlantısı yaklaşık her 6 saatte bir otomatik doğrulanır.",
    };
  }
}
