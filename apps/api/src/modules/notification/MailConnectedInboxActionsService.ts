import { Injectable, Logger } from "@nestjs/common";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";

@Injectable()
export class MailConnectedInboxActionsService {
  private readonly logger = new Logger(MailConnectedInboxActionsService.name);

  public constructor(
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
  ) {}

  public async syncTrashState(
    organizationId: string,
    row: MailInboundMessageEntity,
    folder: "inbox" | "archive" | "trash",
    previousFolder: "inbox" | "archive" | "trash",
  ): Promise<void> {
    if (folder === "trash") {
      await this.moveToProviderTrash(organizationId, row);
      return;
    }
    if (previousFolder === "trash" && folder === "inbox") {
      await this.restoreFromProviderTrash(organizationId, row);
    }
  }

  public async syncPermanentDelete(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<void> {
    try {
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.deleteMessagePermanently(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      }
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.deleteMessagePermanently(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_delete_failed";
      this.logger.warn(`Connected permanent delete failed: ${message}`);
    }
  }

  private async moveToProviderTrash(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<void> {
    try {
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.moveMessageToTrash(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      }
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.moveMessageToTrash(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_trash_failed";
      this.logger.warn(`Connected trash sync failed: ${message}`);
    }
  }

  private async restoreFromProviderTrash(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<void> {
    try {
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.untrashMessage(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_untrash_failed";
      this.logger.warn(`Connected restore sync failed: ${message}`);
    }
  }
}
