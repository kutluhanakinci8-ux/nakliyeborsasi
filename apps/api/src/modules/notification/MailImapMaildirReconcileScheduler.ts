import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailImapMaildirReconcileService } from "./MailImapMaildirReconcileService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 20 * 60 * 1000;

function readIntervalMs(): number {
  const raw = process.env.MAIL_IMAP_RECONCILE_INTERVAL_MS?.trim();
  if (!raw) {
    return DEFAULT_INTERVAL_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 120_000) {
    return DEFAULT_INTERVAL_MS;
  }
  return parsed;
}

@Injectable()
export class MailImapMaildirReconcileScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailImapMaildirReconcileScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly mailImapMaildirReconcileService: MailImapMaildirReconcileService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      this.logger.log("IMAP maildir reconcile scheduler kapalı (runtime role)");
      return;
    }
    const intervalMs = readIntervalMs();
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(
      `IMAP maildir reconcile aktif (${Math.round(intervalMs / 60_000)} dk).`,
    );
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      const summary =
        await this.mailImapMaildirReconcileService.reconcileAllOrganizations(
          400,
        );
      if (summary.organizations > 0) {
        this.logger.log(
          `IMAP reconcile orgs=${summary.organizations} scanned=${summary.scanned} folder=${summary.updatedFolder}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : "imap reconcile tick failed",
      );
    }
  }
}
