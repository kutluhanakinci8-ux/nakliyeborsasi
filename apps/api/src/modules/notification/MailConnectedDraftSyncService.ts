import { Injectable, Logger } from "@nestjs/common";
import { MailComposeDraftEntity } from "../../infrastructure/database/entities/MailComposeDraftEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";
import type { ConnectedSendProvider } from "./MailConnectedOutboundService";

@Injectable()
export class MailConnectedDraftSyncService {
  private readonly logger = new Logger(MailConnectedDraftSyncService.name);

  public constructor(
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
  ) {}

  public async syncLertaDraftToProvider(
    organizationId: string,
    row: MailComposeDraftEntity,
    connected?: {
      connectedSendProvider?: ConnectedSendProvider;
      connectedSendAccountId?: string;
    },
  ): Promise<MailComposeDraftEntity> {
    const provider =
      connected?.connectedSendProvider ?? row.connectedSendProvider;
    const accountId =
      connected?.connectedSendAccountId ?? row.connectedSendAccountId;
    if (!provider || !accountId) {
      return row;
    }
    row.connectedSendProvider = provider;
    row.connectedSendAccountId = accountId;
    try {
      if (provider === "microsoft_graph") {
        const providerDraftId =
          await this.mailExchangeGraphSyncService.upsertDraftMessage(
            organizationId,
            accountId,
            {
              providerMessageId: row.providerDraftId,
              to: row.toAddress,
              subject: row.subject,
              text: row.bodyText,
            },
          );
        row.providerDraftId = providerDraftId;
      } else {
        const providerDraftId = await this.mailGmailSyncService.upsertDraftMessage(
          organizationId,
          accountId,
          {
            providerDraftId: row.providerDraftId,
            to: row.toAddress,
            subject: row.subject,
            text: row.bodyText,
          },
        );
        row.providerDraftId = providerDraftId;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_draft_sync_failed";
      this.logger.warn(
        `Connected draft sync failed org=${organizationId}: ${message}`,
      );
    }
    return row;
  }

  public async deleteProviderDraft(
    organizationId: string,
    row: MailComposeDraftEntity,
  ): Promise<void> {
    if (!row.connectedSendProvider || !row.connectedSendAccountId) {
      return;
    }
    if (!row.providerDraftId) {
      return;
    }
    try {
      if (row.connectedSendProvider === "microsoft_graph") {
        await this.mailExchangeGraphSyncService.deleteDraftMessage(
          organizationId,
          row.connectedSendAccountId,
          row.providerDraftId,
        );
      } else {
        await this.mailGmailSyncService.deleteDraftMessage(
          organizationId,
          row.connectedSendAccountId,
          row.providerDraftId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_draft_delete_failed";
      this.logger.warn(`Connected draft delete failed: ${message}`);
    }
  }
}
