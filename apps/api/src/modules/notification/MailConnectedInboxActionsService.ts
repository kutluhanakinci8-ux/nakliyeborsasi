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
  ): Promise<string | null> {
    if (folder === previousFolder) {
      return null;
    }
    if (folder === "trash") {
      return this.moveToProviderTrash(organizationId, row);
    }
    if (previousFolder === "trash" && folder === "inbox") {
      return this.restoreFromProviderTrash(organizationId, row);
    }
    if (folder === "archive" && previousFolder !== "trash") {
      return this.archiveOnProvider(organizationId, row);
    }
    if (folder === "inbox" && previousFolder === "archive") {
      return this.moveToProviderInbox(organizationId, row);
    }
    return null;
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

  private joinWarnings(parts: Array<string | null>): string | null {
    const merged = parts.filter((part): part is string => Boolean(part?.trim()));
    return merged.length > 0 ? merged.join(" · ") : null;
  }

  private async moveToProviderTrash(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<string | null> {
    const warnings: Array<string | null> = [];
    if (row.exchangeSyncAccountId && row.exchangeMessageId) {
      try {
        await this.mailExchangeGraphSyncService.moveMessageToTrash(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_trash_failed";
        this.logger.warn(`Connected trash sync failed: ${message}`);
        warnings.push(`Microsoft: ${message}`);
      }
    }
    if (row.gmailSyncAccountId && row.gmailMessageId) {
      try {
        await this.mailGmailSyncService.moveMessageToTrash(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_trash_failed";
        this.logger.warn(`Connected trash sync failed: ${message}`);
        warnings.push(`Gmail: ${message}`);
      }
    }
    return this.joinWarnings(warnings);
  }

  private async restoreFromProviderTrash(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<string | null> {
    const warnings: Array<string | null> = [];
    if (row.exchangeSyncAccountId && row.exchangeMessageId) {
      try {
        await this.mailExchangeGraphSyncService.restoreMessageFromTrash(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_untrash_failed";
        this.logger.warn(`Connected restore sync failed: ${message}`);
        warnings.push(`Microsoft: ${message}`);
      }
    }
    if (row.gmailSyncAccountId && row.gmailMessageId) {
      try {
        await this.mailGmailSyncService.untrashMessage(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_untrash_failed";
        this.logger.warn(`Connected restore sync failed: ${message}`);
        warnings.push(`Gmail: ${message}`);
      }
    }
    return this.joinWarnings(warnings);
  }

  private async archiveOnProvider(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<string | null> {
    const warnings: Array<string | null> = [];
    if (row.exchangeSyncAccountId && row.exchangeMessageId) {
      try {
        await this.mailExchangeGraphSyncService.moveMessageToArchive(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_archive_failed";
        this.logger.warn(`Connected archive sync failed: ${message}`);
        warnings.push(`Microsoft: ${message}`);
      }
    }
    if (row.gmailSyncAccountId && row.gmailMessageId) {
      try {
        await this.mailGmailSyncService.archiveMessage(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_archive_failed";
        this.logger.warn(`Connected archive sync failed: ${message}`);
        warnings.push(`Gmail: ${message}`);
      }
    }
    return this.joinWarnings(warnings);
  }

  private async moveToProviderInbox(
    organizationId: string,
    row: MailInboundMessageEntity,
  ): Promise<string | null> {
    const warnings: Array<string | null> = [];
    if (row.exchangeSyncAccountId && row.exchangeMessageId) {
      try {
        await this.mailExchangeGraphSyncService.moveMessageToInbox(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_inbox_failed";
        this.logger.warn(`Connected inbox restore sync failed: ${message}`);
        warnings.push(`Microsoft: ${message}`);
      }
    }
    if (row.gmailSyncAccountId && row.gmailMessageId) {
      try {
        await this.mailGmailSyncService.moveMessageToInbox(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "connected_inbox_failed";
        this.logger.warn(`Connected inbox restore sync failed: ${message}`);
        warnings.push(`Gmail: ${message}`);
      }
    }
    return this.joinWarnings(warnings);
  }
}
