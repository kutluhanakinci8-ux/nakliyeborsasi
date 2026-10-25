import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailGmailSyncService } from "./MailGmailSyncService";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";

@Injectable()
export class MailConnectedAccountsPushService {
  private readonly logger = new Logger(MailConnectedAccountsPushService.name);

  public constructor(
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly gmailAccountRepository: Repository<MailGmailSyncAccountEntity>,
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeAccountRepository: Repository<MailExchangeSyncAccountEntity>,
    private readonly mailGmailSyncService: MailGmailSyncService,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
  ) {}

  public async handleGmailPubSub(
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; synced?: number }> {
    const envelope = body.message as { data?: string } | undefined;
    if (!envelope?.data) {
      return { ok: true };
    }
    let decoded: { emailAddress?: string; historyId?: string };
    try {
      decoded = JSON.parse(
        Buffer.from(envelope.data, "base64").toString("utf8"),
      ) as { emailAddress?: string; historyId?: string };
    } catch {
      return { ok: true };
    }
    const email = decoded.emailAddress?.toLowerCase();
    if (!email) {
      return { ok: true };
    }
    const account = await this.gmailAccountRepository.findOne({
      where: { emailAddress: email, enabled: true },
    });
    if (!account) {
      return { ok: true };
    }
    await this.mailGmailSyncService.syncAccount(
      account.organizationId,
      account.id,
      null,
    );
    return { ok: true, synced: 1 };
  }

  public async handleMicrosoftGraphNotification(
    body: Record<string, unknown>,
    validationToken?: string,
  ): Promise<string | { ok: boolean; synced?: number }> {
    if (validationToken) {
      return validationToken;
    }
    const notifications = body.value as
      | Array<{ clientState?: string; subscriptionId?: string }>
      | undefined;
    let synced = 0;
    for (const notification of notifications ?? []) {
      const accountId = notification.clientState?.trim();
      if (accountId) {
        const account = await this.exchangeAccountRepository.findOne({
          where: { id: accountId, enabled: true },
        });
        if (account) {
          await this.mailExchangeGraphSyncService.syncAccount(
            account.organizationId,
            account.id,
            null,
          );
          synced += 1;
          continue;
        }
      }
    }
    if (synced === 0 && (notifications?.length ?? 0) > 0) {
      const accounts = await this.exchangeAccountRepository.find({
        where: { enabled: true },
        take: 3,
      });
      for (const account of accounts) {
        try {
          await this.mailExchangeGraphSyncService.syncAccount(
            account.organizationId,
            account.id,
            null,
          );
          synced += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "graph_push_sync_failed";
          this.logger.warn(`Graph push sync failed: ${message}`);
        }
      }
    }
    return { ok: true, synced };
  }
}
