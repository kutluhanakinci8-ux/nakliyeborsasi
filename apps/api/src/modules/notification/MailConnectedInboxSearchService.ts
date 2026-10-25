import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";
import type { ConnectedInboxSourceFilter } from "./MailOrganizationInboxService";

export type MailConnectedExternalSearchHit = {
  provider: "microsoft_graph" | "gmail_api";
  accountId: string;
  accountEmail: string;
  providerMessageId: string;
  subject: string;
  fromAddress: string;
  receivedAt: string | null;
  snippet: string | null;
  localMessageId: string | null;
};

@Injectable()
export class MailConnectedInboxSearchService {
  private readonly logger = new Logger(MailConnectedInboxSearchService.name);

  public constructor(
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly gmailRepository: Repository<MailGmailSyncAccountEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
  ) {}

  public async searchExternal(
    organizationId: string,
    query: string,
    connectedSource: ConnectedInboxSourceFilter = "all",
    limit = 15,
  ): Promise<MailConnectedExternalSearchHit[]> {
    const term = query.trim();
    if (term.length < 3) {
      return [];
    }
    const hits: MailConnectedExternalSearchHit[] = [];
    if (connectedSource === "all" || connectedSource === "microsoft_graph") {
      const accounts = await this.exchangeRepository.find({
        where: { organizationId, enabled: true },
      });
      for (const account of accounts) {
        try {
          const rows = await this.mailExchangeGraphSyncService.searchMessages(
            organizationId,
            account.id,
            term,
            limit,
          );
          for (const row of rows) {
            hits.push(await this.mapExchangeHit(account, row));
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "graph_search_failed";
          this.logger.warn(
            `Graph search failed account=${account.id}: ${message}`,
          );
        }
      }
    }
    if (connectedSource === "all" || connectedSource === "gmail_api") {
      const accounts = await this.gmailRepository.find({
        where: { organizationId, enabled: true },
      });
      for (const account of accounts) {
        try {
          const rows = await this.mailGmailSyncService.searchMessages(
            organizationId,
            account.id,
            term,
            limit,
          );
          for (const row of rows) {
            hits.push(await this.mapGmailHit(account, row));
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "gmail_search_failed";
          this.logger.warn(
            `Gmail search failed account=${account.id}: ${message}`,
          );
        }
      }
    }
    return hits.slice(0, limit);
  }

  private async mapExchangeHit(
    account: MailExchangeSyncAccountEntity,
    row: {
      id: string;
      subject: string;
      fromAddress: string;
      receivedAt: string | null;
      snippet: string | null;
    },
  ): Promise<MailConnectedExternalSearchHit> {
    const local = await this.inboundRepository.findOne({
      where: {
        exchangeSyncAccountId: account.id,
        exchangeMessageId: row.id,
      },
    });
    return {
      provider: "microsoft_graph",
      accountId: account.id,
      accountEmail: account.emailAddress,
      providerMessageId: row.id,
      subject: row.subject,
      fromAddress: row.fromAddress,
      receivedAt: row.receivedAt,
      snippet: row.snippet,
      localMessageId: local?.id ?? null,
    };
  }

  private async mapGmailHit(
    account: MailGmailSyncAccountEntity,
    row: {
      id: string;
      subject: string;
      fromAddress: string;
      receivedAt: string | null;
      snippet: string | null;
    },
  ): Promise<MailConnectedExternalSearchHit> {
    const local = await this.inboundRepository.findOne({
      where: {
        gmailSyncAccountId: account.id,
        gmailMessageId: row.id,
      },
    });
    return {
      provider: "gmail_api",
      accountId: account.id,
      accountEmail: account.emailAddress,
      providerMessageId: row.id,
      subject: row.subject,
      fromAddress: row.fromAddress,
      receivedAt: row.receivedAt,
      snippet: row.snippet,
      localMessageId: local?.id ?? null,
    };
  }
}
