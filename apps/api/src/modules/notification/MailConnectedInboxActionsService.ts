import { Injectable, Logger } from "@nestjs/common";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";

type MailboxFolder = "inbox" | "archive" | "trash";

@Injectable()
export class MailConnectedInboxActionsService {
  private readonly logger = new Logger(MailConnectedInboxActionsService.name);

  public constructor(
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
  ) {}

  /** Tekil ve toplu klasör değişikliklerinde sağlayıcıyı günceller. */
  public async syncMailboxFolderState(
    organizationId: string,
    row: MailInboundMessageEntity,
    folder: MailboxFolder,
    previousFolder: MailboxFolder,
  ): Promise<void> {
    if (folder === previousFolder) {
      return;
    }
    if (folder === "trash") {
      await this.moveToProviderTrash(organizationId, row);
      return;
    }
    if (previousFolder === "trash" && folder === "inbox") {
      await this.restoreFromProviderTrash(organizationId, row);
      return;
    }
    if (folder === "archive" && previousFolder !== "trash") {
      await this.archiveOnProvider(organizationId, row);
      return;
    }
    if (folder === "inbox" && previousFolder === "archive") {
      await this.moveToProviderInbox(organizationId, row);
    }
  }

  /** @deprecated use syncMailboxFolderState */
  public async syncTrashState(
    organizationId: string,
    row: MailInboundMessageEntity,
    folder: MailboxFolder,
    previousFolder: MailboxFolder,
  ): Promise<void> {
    await this.syncMailboxFolderState(
      organizationId,
      row,
      folder,
      previousFolder,
    );
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
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.restoreMessageFromTrash(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      }
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

  private async archiveOnProvider(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<void> {
    try {
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.moveMessageToArchive(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      }
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.archiveMessage(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_archive_failed";
      this.logger.warn(`Connected archive sync failed: ${message}`);
    }
  }

  private async moveToProviderInbox(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<void> {
    try {
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.moveMessageToInbox(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      }
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.moveMessageToInbox(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_inbox_failed";
      this.logger.warn(`Connected inbox restore sync failed: ${message}`);
    }
  }
}
