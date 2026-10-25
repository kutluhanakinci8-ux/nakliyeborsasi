import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";
import { MailRuntimeRoleService } from "./MailRuntimeRoleService";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class MailConnectedPushRenewScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MailConnectedPushRenewScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeAccountRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly gmailAccountRepository: Repository<MailGmailSyncAccountEntity>,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
    private readonly mailRuntimeRoleService: MailRuntimeRoleService,
  ) {}

  public onModuleInit(): void {
    if (!this.mailRuntimeRoleService.shouldRunBackgroundJobs()) {
      return;
    }
    void this.tick();
    this.timer = setInterval(() => void this.tick(), DEFAULT_INTERVAL_MS);
    this.logger.log("CAP push yenileme zamanlayıcısı aktif (15 dk).");
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.mailExchangeGraphSyncService.isConfigured()) {
      return;
    }
    const exchangeAccounts = await this.exchangeAccountRepository.find({
      where: { enabled: true },
      take: 80,
    });
    for (const account of exchangeAccounts) {
      try {
        await this.mailExchangeGraphSyncService.renewGraphMailPushSubscription(
          account.organizationId,
          account.id,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "graph_push_renew_failed";
        this.logger.warn(
          `Graph push renew failed account=${account.id}: ${message}`,
        );
      }
    }
    const gmailAccounts = await this.gmailAccountRepository.find({
      where: { enabled: true },
      take: 200,
    });
    for (const account of gmailAccounts) {
      try {
        await this.mailGmailSyncService.renewGmailWatchIfNeeded(
          account.organizationId,
          account.id,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "gmail_watch_renew_failed";
        this.logger.warn(
          `Gmail watch renew failed account=${account.id}: ${message}`,
        );
      }
    }
  }
}
