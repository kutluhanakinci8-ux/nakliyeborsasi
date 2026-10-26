import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { readFileSync } from "node:fs";
import {
  Brackets,
  In,
  IsNull,
  Not,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  MailInboundAttachmentMeta,
  MailInboundMessageEntity,
} from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { resolveMailSenderAddresses } from "@nakliyeborsasi/core";
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailImapMaildirService } from "./MailImapMaildirService";
import {
  parseAddressListFromMime,
  reparseInboundDisplayFromRawMime,
} from "./MailInboundMimeParse";
import {
  decodeMimeEncodedWords,
  repairUtf8Mojibake,
} from "./MailMimeCharset";
import { extractInstagramVerificationCode } from "./instagramVerificationMail";
import { sanitizeInboundHtml } from "./MailHtmlSanitize";
import {
  MailInboxActor,
  MailMailboxAccessService,
} from "./MailMailboxAccessService";
import { MailExchangeGraphSyncService } from "./MailExchangeGraphSyncService";
import { MailGmailSyncService } from "./MailGmailSyncService";
import { MailConnectedInboxActionsService } from "./MailConnectedInboxActionsService";
import { MailInboxCategoryOverrideEntity } from "../../infrastructure/database/entities/MailInboxCategoryOverrideEntity";
import {
  MailInboxCategory,
  normalizeInboxCategory,
} from "./MailInboxCategoryCatalog";

export type InboxFolder =
  | "inbox"
  | "spam"
  | "all"
  | "archive"
  | "trash"
  | "starred"
  | "snoozed";
export type MailboxFolder = "inbox" | "archive" | "trash";

export type MailInboxSearchFilters = {
  q?: string;
  fromAddress?: string;
  receivedAfter?: Date;
  receivedBefore?: Date;
  hasAttachment?: boolean;
};

export type ConnectedInboxSourceFilter =
  | "all"
  | "lerta"
  | "microsoft_graph"
  | "gmail_api";

export type MailInboxListRow = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  spamStatus: string;
  spamReason: string | null;
  attachmentCount: number;
  starredAt: string | null;
  customFolderId: string | null;
  aiFocusLane: "focus" | "other" | null;
  inboxCategory: MailInboxCategory | null;
  messageKind: "inbound" | "sent";
  inboxSource?: {
    provider: "lerta" | "microsoft_graph" | "gmail_api";
    accountId: string | null;
    accountEmail: string | null;
    label: string;
  };
};

@Injectable()
export class MailOrganizationInboxService {
  private readonly logger = new Logger(MailOrganizationInboxService.name);

  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly exchangeSyncAccountRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly gmailSyncAccountRepository: Repository<MailGmailSyncAccountEntity>,
    @InjectRepository(MailInboxCategoryOverrideEntity)
    private readonly categoryOverrideRepository: Repository<MailInboxCategoryOverrideEntity>,
    private readonly mailImapMaildirService: MailImapMaildirService,
    private readonly mailMailboxAccessService: MailMailboxAccessService,
    private readonly mailExchangeGraphSyncService: MailExchangeGraphSyncService,
    private readonly mailGmailSyncService: MailGmailSyncService,
    private readonly mailConnectedInboxActionsService: MailConnectedInboxActionsService,
  ) {}

  public async getSummary(
    organizationId: string,
    actor?: MailInboxActor,
  ): Promise<{
    primaryAddress: string | null;
    technicalPrimaryAddress: string | null;
    mailboxId: string | null;
    unreadCount: number;
    totalMessages: number;
    spamCount: number;
    archiveCount: number;
    trashCount: number;
    starredCount: number;
    snoozedCount: number;
  }> {
    const primaryAddress = await this.resolvePrimaryAddress(organizationId);
    const technicalPrimaryAddress =
      await this.resolvePrimaryTechnicalAddress(organizationId);
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return {
        primaryAddress,
        technicalPrimaryAddress,
        mailboxId: null,
        unreadCount: 0,
        totalMessages: 0,
        spamCount: 0,
        archiveCount: 0,
        trashCount: 0,
        starredCount: 0,
        snoozedCount: 0,
      };
    }
    const now = new Date();
    const inboxWhere = {
      mailboxId: In(mailboxIds),
      spamStatus: In(["clean", "suspected"]),
      mailboxFolder: "inbox" as const,
    };
    const visibleInboxQb = () =>
      this.inboundRepository
        .createQueryBuilder("m")
        .where("m.mailboxId IN (:...mailboxIds)", { mailboxIds })
        .andWhere("m.spamStatus IN (:...spam)", { spam: ["clean", "suspected"] })
        .andWhere("m.mailboxFolder = :inbox", { inbox: "inbox" })
        .andWhere(
          "(m.snoozedUntil IS NULL OR m.snoozedUntil <= :now)",
          { now },
        );
    const [
      totalMessages,
      unreadCount,
      spamCount,
      archiveCount,
      trashCount,
      starredCount,
      snoozedCount,
    ] = await Promise.all([
      visibleInboxQb().getCount(),
      visibleInboxQb().andWhere("m.readAt IS NULL").getCount(),
      this.inboundRepository.count({
        where: {
          mailboxId: In(mailboxIds),
          spamStatus: "blocked",
          mailboxFolder: In(["inbox", "archive"]),
        },
      }),
      this.inboundRepository.count({
        where: { mailboxId: In(mailboxIds), mailboxFolder: "archive" },
      }),
      this.inboundRepository.count({
        where: { mailboxId: In(mailboxIds), mailboxFolder: "trash" },
      }),
      this.inboundRepository.count({
        where: {
          mailboxId: In(mailboxIds),
          starredAt: Not(IsNull()),
          mailboxFolder: In(["inbox", "archive"]),
        },
      }),
      this.inboundRepository
        .createQueryBuilder("m")
        .where("m.mailboxId IN (:...mailboxIds)", { mailboxIds })
        .andWhere("m.mailboxFolder = :inbox", { inbox: "inbox" })
        .andWhere("m.snoozedUntil > :now", { now })
        .getCount(),
    ]);
    const mailbox = technicalPrimaryAddress
      ? await this.mailboxRepository.findOne({
          where: { organizationId, emailAddress: technicalPrimaryAddress },
        })
      : null;
    return {
      primaryAddress,
      technicalPrimaryAddress,
      mailboxId: mailbox?.id ?? null,
      unreadCount,
      totalMessages,
      spamCount,
      archiveCount,
      trashCount,
      starredCount,
      snoozedCount,
    };
  }

  public async listMessages(
    organizationId: string,
    folder: InboxFolder = "inbox",
    limit = 50,
    customFolderId?: string | null,
    actor?: MailInboxActor,
    connectedSource: ConnectedInboxSourceFilter = "all",
  ): Promise<MailInboxListRow[]> {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return [];
    }
    const sourceCtx = await this.loadInboxSourceContext(organizationId);
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    this.applyFolderToQueryBuilder(qb, folder, customFolderId);
    this.applySnoozeListFilter(qb, folder);
    this.applyConnectedSourceFilter(qb, connectedSource);
    this.applyExchangeDraftExclusion(qb, folder);
    const rows = await qb
      .orderBy("m.receivedAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => this.toListRow(row, sourceCtx));
  }

  public async listConnectedSyncedDrafts(
    organizationId: string,
    actor?: MailInboxActor,
    connectedSource: ConnectedInboxSourceFilter = "all",
    limit = 40,
  ): Promise<MailInboxListRow[]> {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return [];
    }
    const sourceCtx = await this.loadInboxSourceContext(organizationId);
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    qb.andWhere("m.exchange_well_known_folder = :draftsFolder", {
      draftsFolder: "drafts",
    });
    this.applyConnectedSourceFilter(qb, connectedSource);
    const rows = await qb
      .orderBy("m.receivedAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => this.toListRow(row, sourceCtx));
  }

  public async searchMessages(
    organizationId: string,
    folder: InboxFolder = "inbox",
    filters: MailInboxSearchFilters = {},
    limit = 50,
    customFolderId?: string | null,
    actor?: MailInboxActor,
    connectedSource: ConnectedInboxSourceFilter = "all",
  ): Promise<MailInboxListRow[]> {
    if (!this.hasSearchCriteria(filters)) {
      return [];
    }
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return [];
    }
    const sourceCtx = await this.loadInboxSourceContext(organizationId);
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    this.applyFolderToQueryBuilder(qb, folder, customFolderId);
    this.applySnoozeListFilter(qb, folder);
    this.applyConnectedSourceFilter(qb, connectedSource);
    this.applyExchangeDraftExclusion(qb, folder);

    const term = filters.q?.trim() ?? "";
    if (term.length >= 2) {
      const pattern = `%${term.replace(/[%_]/g, "")}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("m.subject ILIKE :textPattern", { textPattern: pattern })
            .orWhere("m.fromAddress ILIKE :textPattern", { textPattern: pattern })
            .orWhere("m.snippet ILIKE :textPattern", { textPattern: pattern })
            .orWhere("m.bodyText ILIKE :textPattern", { textPattern: pattern });
        }),
      );
    }

    const from = filters.fromAddress?.trim() ?? "";
    if (from.length > 0) {
      const fromPattern = `%${from.replace(/[%_]/g, "")}%`;
      qb.andWhere("m.fromAddress ILIKE :fromPattern", { fromPattern });
    }

    if (filters.receivedAfter) {
      qb.andWhere("m.receivedAt >= :receivedAfter", {
        receivedAfter: filters.receivedAfter,
      });
    }
    if (filters.receivedBefore) {
      qb.andWhere("m.receivedAt <= :receivedBefore", {
        receivedBefore: filters.receivedBefore,
      });
    }
    if (filters.hasAttachment === true) {
      qb.andWhere(
        "m.attachments IS NOT NULL AND jsonb_array_length(m.attachments) > 0",
      );
    } else if (filters.hasAttachment === false) {
      qb.andWhere(
        "(m.attachments IS NULL OR jsonb_array_length(m.attachments) = 0)",
      );
    }

    const rows = await qb
      .orderBy("m.receivedAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => this.toListRow(row, sourceCtx));
  }

  public async getMessage(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<{
    id: string;
    fromAddress: string;
    subject: string;
    snippet: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    receivedAt: string;
    readAt: string | null;
    starredAt: string | null;
    snoozedUntil: string | null;
    toRecipients: string[];
    ccRecipients: string[];
    emailAddress: string;
    spamStatus: string;
    spamReason: string | null;
    mailboxFolder: MailboxFolder;
    attachments: {
      index: number;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }[];
    instagramVerificationCode: string | null;
  }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    let bodyText = row.bodyText;
    let bodyHtml = row.bodyHtml;
    let subject = row.subject;
    let snippet = row.snippet;
    let toRecipients = row.toRecipients;
    let ccRecipients = row.ccRecipients;
    if (row.rawMimePath) {
      try {
        const rawMime = readFileSync(row.rawMimePath, "latin1");
        const reparsed = reparseInboundDisplayFromRawMime(rawMime);
        if (reparsed.subject) {
          subject = reparsed.subject;
        }
        if (reparsed.bodyText) {
          bodyText = reparsed.bodyText;
        }
        if (reparsed.bodyHtml) {
          bodyHtml = sanitizeInboundHtml(reparsed.bodyHtml);
        }
        if (reparsed.snippet) {
          snippet = reparsed.snippet;
        }
        if (
          (!toRecipients || toRecipients.length === 0) &&
          (!ccRecipients || ccRecipients.length === 0)
        ) {
          toRecipients = parseAddressListFromMime(rawMime, "To");
          ccRecipients = parseAddressListFromMime(rawMime, "Cc");
          if (toRecipients.length > 0 || ccRecipients.length > 0) {
            row.toRecipients = toRecipients;
            row.ccRecipients = ccRecipients;
            await this.inboundRepository.save(row);
          }
        }
      } catch {
        if (!bodyText) {
          bodyText = row.snippet;
        }
      }
    } else {
      subject = decodeMimeEncodedWords(subject);
    }
    const resolvedBodyText = bodyText ?? snippet ?? row.snippet;
    const instagramVerificationCode = extractInstagramVerificationCode({
      fromAddress: row.fromAddress,
      subject,
      bodyText: resolvedBodyText,
      bodyHtml,
    });
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject,
      snippet,
      bodyText: resolvedBodyText,
      bodyHtml,
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      emailAddress: mailbox?.emailAddress ?? "—",
      spamStatus: row.spamStatus,
      spamReason: row.spamReason,
      mailboxFolder: row.mailboxFolder ?? "inbox",
      starredAt: row.starredAt?.toISOString() ?? null,
      snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
      toRecipients: toRecipients ?? [],
      ccRecipients: ccRecipients ?? [],
      attachments: (row.attachments ?? []).map((file, index) => ({
        index,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
      })),
      instagramVerificationCode,
    };
  }

  public async getAttachment(
    organizationId: string,
    messageId: string,
    index: number,
    actor?: MailInboxActor,
  ): Promise<{ file: MailInboundAttachmentMeta; buffer: Buffer }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    const file = row.attachments?.[index];
    if (!file) {
      throw new NotFoundException("Ek bulunamadı");
    }
    if (
      row.exchangeSyncAccountId &&
      row.exchangeMessageId &&
      file.exchangeAttachmentId
    ) {
      const graph = await this.mailExchangeGraphSyncService.fetchAttachmentBytes(
        organizationId,
        row.exchangeSyncAccountId,
        row.exchangeMessageId,
        file.exchangeAttachmentId,
      );
      return {
        file: {
          ...file,
          contentType: graph.contentType || file.contentType,
        },
        buffer: graph.buffer,
      };
    }
    if (
      row.gmailSyncAccountId &&
      row.gmailMessageId &&
      file.gmailAttachmentId
    ) {
      const gmail = await this.mailGmailSyncService.fetchAttachmentBytes(
        organizationId,
        row.gmailSyncAccountId,
        row.gmailMessageId,
        file.gmailAttachmentId,
      );
      return {
        file: {
          ...file,
          contentType: gmail.contentType || file.contentType,
        },
        buffer: gmail.buffer,
      };
    }
    if (!file.storagePath) {
      throw new NotFoundException("Ek bulunamadı");
    }
    const buffer = readFileSync(file.storagePath);
    return { file, buffer };
  }

  public async listConversationThreads(
    organizationId: string,
    folder: InboxFolder = "inbox",
    limit = 40,
    customFolderId?: string | null,
    actor?: MailInboxActor,
    connectedSource: ConnectedInboxSourceFilter = "all",
  ): Promise<
    {
      threadId: string;
      subject: string;
      fromAddress: string;
      snippet: string | null;
      receivedAt: string;
      messageCount: number;
      unreadCount: number;
      latestMessageId: string;
    }[]
  > {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return [];
    }
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    this.applyFolderToQueryBuilder(qb, folder, customFolderId);
    this.applySnoozeListFilter(qb, folder);
    this.applyConnectedSourceFilter(qb, connectedSource);
    this.applyExchangeDraftExclusion(qb, folder);
    const rows = await qb
      .orderBy("m.receivedAt", "DESC")
      .take(300)
      .getMany();
    const byInternetId = new Map<string, MailInboundMessageEntity>();
    for (const row of rows) {
      if (row.internetMessageId) {
        byInternetId.set(row.internetMessageId, row);
      }
    }
    const threadBuckets = new Map<string, MailInboundMessageEntity[]>();
    for (const row of rows) {
      const threadId = this.resolveThreadRootId(row, byInternetId);
      const bucket = threadBuckets.get(threadId) ?? [];
      bucket.push(row);
      threadBuckets.set(threadId, bucket);
    }
    const threads = [...threadBuckets.entries()].map(([threadId, messages]) => {
      const sorted = [...messages].sort(
        (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
      );
      const latest = sorted[0];
      const unreadCount = messages.filter((m) => !m.readAt).length;
      return {
        threadId,
        subject: latest.subject,
        fromAddress: latest.fromAddress,
        snippet: latest.snippet,
        receivedAt: latest.receivedAt.toISOString(),
        messageCount: messages.length,
        unreadCount,
        latestMessageId: latest.id,
      };
    });
    threads.sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
    return threads.slice(0, limit);
  }

  public async listThreadMessages(
    organizationId: string,
    threadId: string,
    folder: InboxFolder = "inbox",
    customFolderId?: string | null,
    actor?: MailInboxActor,
  ): Promise<
    {
      id: string;
      fromAddress: string;
      subject: string;
      snippet: string | null;
      receivedAt: string;
      readAt: string | null;
      spamStatus: string;
      spamReason: string | null;
      attachmentCount: number;
    }[]
  > {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return [];
    }
    const rows = await this.inboundRepository.find({
      where: this.whereForFolder(mailboxIds, folder, customFolderId),
      order: { receivedAt: "ASC" },
      take: 300,
    });
    const byInternetId = new Map<string, MailInboundMessageEntity>();
    for (const row of rows) {
      if (row.internetMessageId) {
        byInternetId.set(row.internetMessageId, row);
      }
    }
    const inThread = rows.filter(
      (row) => this.resolveThreadRootId(row, byInternetId) === threadId,
    );
    const sourceCtx = await this.loadInboxSourceContext(organizationId);
    return inThread.map((row) => this.toListRow(row, sourceCtx));
  }

  public async markRead(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (!row.readAt) {
      row.readAt = new Date();
      await this.inboundRepository.save(row);
      await this.syncExchangeReadState(organizationId, row, true);
    }
  }

  public async setStarred(
    organizationId: string,
    messageId: string,
    starred: boolean,
    actor?: MailInboxActor,
  ): Promise<{ starredAt: string | null }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (row.mailboxFolder === "trash") {
      throw new ForbiddenException("Çöp kutusundaki mesaj yıldızlanamaz.");
    }
    row.starredAt = starred ? new Date() : null;
    await this.inboundRepository.save(row);
    await this.syncConnectedStarState(organizationId, row, starred);
    return { starredAt: row.starredAt?.toISOString() ?? null };
  }

  public async markUnread(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (row.readAt) {
      row.readAt = null;
      await this.inboundRepository.save(row);
      await this.syncExchangeReadState(organizationId, row, false);
    }
  }

  public async bulkMarkRead(
    organizationId: string,
    messageIds: string[],
    actor?: MailInboxActor,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId, actor);
      if (!row.readAt) {
        row.readAt = new Date();
        await this.inboundRepository.save(row);
        await this.syncExchangeReadState(organizationId, row, true);
        updated += 1;
      }
    }
    return { updated };
  }

  public async bulkMarkUnread(
    organizationId: string,
    messageIds: string[],
    actor?: MailInboxActor,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId, actor);
      if (row.readAt) {
        row.readAt = null;
        await this.inboundRepository.save(row);
        await this.syncExchangeReadState(organizationId, row, false);
        updated += 1;
      }
    }
    return { updated };
  }

  public async bulkSetMailboxFolder(
    organizationId: string,
    messageIds: string[],
    folder: MailboxFolder,
    actor?: MailInboxActor,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      await this.setMailboxFolder(organizationId, messageId, folder, actor);
      updated += 1;
    }
    return { updated };
  }

  public async bulkSetStarred(
    organizationId: string,
    messageIds: string[],
    starred: boolean,
    actor?: MailInboxActor,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId, actor);
      if (row.mailboxFolder === "trash") {
        continue;
      }
      const wasStarred = row.starredAt !== null;
      if (starred && !wasStarred) {
        row.starredAt = new Date();
        await this.inboundRepository.save(row);
        await this.syncConnectedStarState(organizationId, row, true);
        updated += 1;
      } else if (!starred && wasStarred) {
        row.starredAt = null;
        await this.inboundRepository.save(row);
        await this.syncConnectedStarState(organizationId, row, false);
        updated += 1;
      }
    }
    return { updated };
  }

  public async setMailboxFolder(
    organizationId: string,
    messageId: string,
    folder: MailboxFolder,
    actor?: MailInboxActor,
  ): Promise<{ mailboxFolder: MailboxFolder; connectedSyncWarning?: string | null }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (row.mailboxFolder === folder) {
      return { mailboxFolder: folder };
    }
    const previousFolder = row.mailboxFolder;
    row.maildirFilePath = this.mailImapMaildirService.relocateMailboxFile(
      row.maildirFilePath,
      folder,
    );
    row.mailboxFolder = folder;
    if (folder !== "inbox") {
      row.customFolderId = null;
    }
    await this.inboundRepository.save(row);
    const connectedSyncWarning =
      await this.mailConnectedInboxActionsService.syncMailboxFolderState(
        organizationId,
        row,
        folder,
        previousFolder,
      );
    return { mailboxFolder: folder, connectedSyncWarning };
  }

  public async deleteMessagePermanently(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (row.mailboxFolder !== "trash") {
      throw new ForbiddenException(
        "Kalıcı silme yalnızca çöp kutusundaki mesajlar için geçerlidir.",
      );
    }
    this.mailImapMaildirService.deleteMailboxFile(row.maildirFilePath);
    await this.mailConnectedInboxActionsService.syncPermanentDelete(
      organizationId,
      row,
    );
    await this.inboundRepository.remove(row);
  }

  /** Çöp kutusundaki tüm gelen mesajları kalıcı siler. */
  public async purgeAllTrashMessages(
    organizationId: string,
    actor?: MailInboxActor,
  ): Promise<{ deleted: number }> {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return { deleted: 0 };
    }
    const rows = await this.inboundRepository.find({
      where: { mailboxId: In(mailboxIds), mailboxFolder: "trash" },
    });
    for (const row of rows) {
      this.mailImapMaildirService.deleteMailboxFile(row.maildirFilePath);
      await this.mailConnectedInboxActionsService.syncPermanentDelete(
        organizationId,
        row,
      );
      await this.inboundRepository.remove(row);
    }
    return { deleted: rows.length };
  }

  private async assertMessageAccess(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<MailInboundMessageEntity> {
    const row = await this.inboundRepository.findOne({
      where: { id: messageId },
    });
    if (!row) {
      throw new NotFoundException("Mesaj bulunamadı");
    }
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    if (!mailbox || mailbox.organizationId !== organizationId) {
      throw new ForbiddenException("Bu mesaja erişim yok");
    }
    if (actor) {
      const allowed = await this.mailMailboxAccessService.canAccessMailbox(
        actor,
        row.mailboxId,
      );
      if (!allowed) {
        throw new ForbiddenException("Bu mesaja erişim yok");
      }
    }
    return row;
  }

  private hasSearchCriteria(filters: MailInboxSearchFilters): boolean {
    if ((filters.q?.trim().length ?? 0) >= 2) {
      return true;
    }
    if ((filters.fromAddress?.trim().length ?? 0) > 0) {
      return true;
    }
    if (filters.receivedAfter || filters.receivedBefore) {
      return true;
    }
    if (filters.hasAttachment !== undefined) {
      return true;
    }
    return false;
  }

  public async snoozeMessage(
    organizationId: string,
    messageId: string,
    snoozedUntil: Date,
    actor?: MailInboxActor,
  ): Promise<{ snoozedUntil: string }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    if (row.mailboxFolder === "trash") {
      throw new BadRequestException("Çöpteki mesaj ertelenemez.");
    }
    row.snoozedUntil = snoozedUntil;
    await this.inboundRepository.save(row);
    return { snoozedUntil: snoozedUntil.toISOString() };
  }

  public async clearSnooze(
    organizationId: string,
    messageId: string,
    actor?: MailInboxActor,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    row.snoozedUntil = null;
    await this.inboundRepository.save(row);
  }

  public async bulkSnoozeMessages(
    organizationId: string,
    messageIds: string[],
    snoozedUntil: Date,
    actor?: MailInboxActor,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId, actor);
      if (row.mailboxFolder === "trash") {
        continue;
      }
      row.snoozedUntil = snoozedUntil;
      await this.inboundRepository.save(row);
      updated += 1;
    }
    return { updated };
  }

  private applySnoozeListFilter(
    qb: SelectQueryBuilder<MailInboundMessageEntity>,
    folder: InboxFolder,
  ): void {
    const now = new Date();
    if (folder === "snoozed") {
      qb.andWhere("m.snoozedUntil > :snoozeNow", { snoozeNow: now });
      return;
    }
    if (folder === "inbox" || folder === "all" || folder === "starred") {
      qb.andWhere(
        "(m.snoozedUntil IS NULL OR m.snoozedUntil <= :snoozeNow)",
        { snoozeNow: now },
      );
    }
  }

  private applyFolderToQueryBuilder(
    qb: SelectQueryBuilder<MailInboundMessageEntity>,
    folder: InboxFolder,
    customFolderId?: string | null,
  ): void {
    if (folder === "trash") {
      qb.andWhere("m.mailboxFolder = :mailFolderTrash", {
        mailFolderTrash: "trash",
      });
      return;
    }
    if (folder === "archive") {
      qb.andWhere("m.mailboxFolder = :mailFolderArchive", {
        mailFolderArchive: "archive",
      });
      return;
    }
    if (folder === "spam") {
      qb.andWhere("m.spamStatus = :spamBlocked", { spamBlocked: "blocked" });
      qb.andWhere("m.mailboxFolder IN (:...spamMailFolders)", {
        spamMailFolders: ["inbox", "archive"],
      });
      return;
    }
    if (folder === "all") {
      qb.andWhere("m.mailboxFolder IN (:...allMailFolders)", {
        allMailFolders: ["inbox", "archive"],
      });
      return;
    }
    if (folder === "starred") {
      qb.andWhere("m.starredAt IS NOT NULL");
      qb.andWhere("m.mailboxFolder IN (:...starredMailFolders)", {
        starredMailFolders: ["inbox", "archive"],
      });
      return;
    }
    if (folder === "snoozed") {
      qb.andWhere("m.spamStatus IN (:...inboxSpamStatuses)", {
        inboxSpamStatuses: ["clean", "suspected"],
      });
      qb.andWhere("m.mailboxFolder = :mailFolderInbox", {
        mailFolderInbox: "inbox",
      });
      return;
    }
    qb.andWhere("m.spamStatus IN (:...inboxSpamStatuses)", {
      inboxSpamStatuses: ["clean", "suspected"],
    });
    qb.andWhere("m.mailboxFolder = :mailFolderInbox", {
      mailFolderInbox: "inbox",
    });
    this.applyInboxCustomFolderFilter(qb, customFolderId);
  }

  private applyInboxCustomFolderFilter(
    qb: SelectQueryBuilder<MailInboundMessageEntity>,
    customFolderId?: string | null,
  ): void {
    if (customFolderId) {
      qb.andWhere("m.customFolderId = :customFolderId", { customFolderId });
      return;
    }
    qb.andWhere("m.customFolderId IS NULL");
  }

  private whereForFolder(
    mailboxIds: string[],
    folder: InboxFolder,
    customFolderId?: string | null,
  ): Record<string, unknown> {
    if (folder === "trash") {
      return { mailboxId: In(mailboxIds), mailboxFolder: "trash" };
    }
    if (folder === "archive") {
      return { mailboxId: In(mailboxIds), mailboxFolder: "archive" };
    }
    if (folder === "spam") {
      return {
        mailboxId: In(mailboxIds),
        spamStatus: "blocked",
        mailboxFolder: In(["inbox", "archive"]),
      };
    }
    if (folder === "all") {
      return {
        mailboxId: In(mailboxIds),
        mailboxFolder: In(["inbox", "archive"]),
      };
    }
    if (folder === "starred") {
      return {
        mailboxId: In(mailboxIds),
        starredAt: Not(IsNull()),
        mailboxFolder: In(["inbox", "archive"]),
      };
    }
    const base: Record<string, unknown> = {
      mailboxId: In(mailboxIds),
      spamStatus: In(["clean", "suspected"]),
      mailboxFolder: "inbox",
    };
    if (customFolderId) {
      base.customFolderId = customFolderId;
    } else {
      base.customFolderId = IsNull();
    }
    return base;
  }

  private async mailboxIds(
    organizationId: string,
    actor?: MailInboxActor,
  ): Promise<string[]> {
    if (actor) {
      return this.mailMailboxAccessService.resolveAccessibleMailboxIds({
        companyId: organizationId,
        userId: actor.userId,
        roleCodes: actor.roleCodes,
      });
    }
    return this.mailMailboxAccessService.allMailboxIdsForOrganization(
      organizationId,
    );
  }

  private async resolvePrimaryAddress(
    organizationId: string,
  ): Promise<string | null> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!sender?.mailDomain) {
      return null;
    }
    return resolveMailSenderAddresses(
      sender.localPart,
      sender.mailDomain,
    ).publicAddress;
  }

  private async resolvePrimaryTechnicalAddress(
    organizationId: string,
  ): Promise<string | null> {
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    if (!sender?.mailDomain) {
      return null;
    }
    return resolveMailSenderAddresses(
      sender.localPart,
      sender.mailDomain,
    ).technicalAddress;
  }

  private async syncConnectedStarState(
    organizationId: string,
    row: MailInboundMessageEntity,
    starred: boolean,
  ): Promise<void> {
    try {
      if (row.exchangeSyncAccountId && row.exchangeMessageId) {
        await this.mailExchangeGraphSyncService.pushStarStateToGraph(
          organizationId,
          row.exchangeSyncAccountId,
          row.exchangeMessageId,
          starred,
        );
      }
      if (row.gmailSyncAccountId && row.gmailMessageId) {
        await this.mailGmailSyncService.pushStarStateToGmail(
          organizationId,
          row.gmailSyncAccountId,
          row.gmailMessageId,
          starred,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "connected_star_failed";
      this.logger.warn(`Connected star sync failed: ${message}`);
    }
  }

  private async syncExchangeReadState(
    organizationId: string,
    row: MailInboundMessageEntity,
    isRead: boolean,
  ): Promise<void> {
    if (row.exchangeSyncAccountId && row.exchangeMessageId) {
      await this.mailExchangeGraphSyncService.pushReadStateToGraph(
        organizationId,
        row.exchangeSyncAccountId,
        row.exchangeMessageId,
        isRead,
      );
    }
    if (row.gmailSyncAccountId && row.gmailMessageId) {
      await this.mailGmailSyncService.pushReadStateToGmail(
        organizationId,
        row.gmailSyncAccountId,
        row.gmailMessageId,
        isRead,
      );
    }
  }

  private applyExchangeDraftExclusion(
    qb: SelectQueryBuilder<MailInboundMessageEntity>,
    folder: InboxFolder,
  ): void {
    if (folder === "inbox" || folder === "all") {
      qb.andWhere(
        "(m.exchange_well_known_folder IS NULL OR m.exchange_well_known_folder <> :exchangeDrafts)",
        { exchangeDrafts: "drafts" },
      );
    }
  }

  private resolveThreadRootId(
    row: MailInboundMessageEntity,
    byInternetId: Map<string, MailInboundMessageEntity>,
  ): string {
    if (row.exchangeConversationId) {
      return row.exchangeConversationId;
    }
    const visited = new Set<string>();
    let current: MailInboundMessageEntity | undefined = row;
    while (current?.inReplyTo && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = byInternetId.get(current.inReplyTo);
      if (!parent) {
        break;
      }
      current = parent;
    }
    return current?.internetMessageId ?? current?.id ?? row.id;
  }

  public async setAiFocusLane(
    organizationId: string,
    messageId: string,
    lane: "focus" | "other",
    actor?: MailInboxActor,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    row.aiFocusLane = lane;
    await this.inboundRepository.save(row);
  }

  public async setMessageInboxCategory(
    organizationId: string,
    messageId: string,
    category: MailInboxCategory | null,
    actor?: MailInboxActor,
    options?: { applyToSender?: boolean },
  ): Promise<{ inboxCategory: MailInboxCategory | null }> {
    const row = await this.assertMessageAccess(organizationId, messageId, actor);
    row.inboxCategory = category;
    await this.inboundRepository.save(row);
    if (options?.applyToSender) {
      const fromLower = row.fromAddress.trim().toLowerCase();
      await this.categoryOverrideRepository.save({
        organizationId,
        fromAddressLower: fromLower,
        inboxCategory: category,
      });
    }
    return { inboxCategory: category };
  }

  public async resolveInboxCategoryForFrom(
    organizationId: string,
    fromAddress: string,
  ): Promise<MailInboxCategory | null> {
    const fromLower = fromAddress.trim().toLowerCase();
    const override = await this.categoryOverrideRepository.findOne({
      where: { organizationId, fromAddressLower: fromLower },
    });
    return override?.inboxCategory ?? null;
  }

  public async refreshAiFocusBatch(
    organizationId: string,
    userId: string,
    classify: (input: {
      subject: string;
      bodySnippet: string;
      fromAddress: string;
    }) => Promise<{ lane: "focus" | "other"; category?: MailInboxCategory | null }>,
    actor?: MailInboxActor,
    limit = 40,
  ): Promise<{ updated: number; skipped: number }> {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return { updated: 0, skipped: 0 };
    }
    const safeLimit = Math.min(Math.max(limit, 1), 80);
    const rows = await this.inboundRepository.find({
      where: {
        mailboxId: In(mailboxIds),
        mailboxFolder: "inbox",
        aiFocusLane: IsNull(),
      },
      order: { receivedAt: "DESC" },
      take: safeLimit,
    });
    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      try {
        const override = await this.resolveInboxCategoryForFrom(
          organizationId,
          row.fromAddress,
        );
        const result = await classify({
          subject: row.subject,
          bodySnippet: row.snippet ?? row.bodyText ?? "",
          fromAddress: row.fromAddress,
        });
        const category =
          override ??
          result.category ??
          normalizeInboxCategory(row.inboxCategory);
        row.aiFocusLane = result.lane;
        row.inboxCategory = category;
        await this.inboundRepository.save(row);
        updated += 1;
      } catch {
        skipped += 1;
      }
    }
    return { updated, skipped };
  }

  public async backfillInboxCategoriesBatch(
    organizationId: string,
    userId: string,
    classify: (input: {
      subject: string;
      bodySnippet: string;
      fromAddress: string;
    }) => Promise<{ category?: MailInboxCategory | null }>,
    actor?: MailInboxActor,
    limit = 40,
  ): Promise<{ updated: number; skipped: number }> {
    const mailboxIds = await this.mailboxIds(organizationId, actor);
    if (mailboxIds.length === 0) {
      return { updated: 0, skipped: 0 };
    }
    const safeLimit = Math.min(Math.max(limit, 1), 80);
    const rows = await this.inboundRepository.find({
      where: {
        mailboxId: In(mailboxIds),
        mailboxFolder: "inbox",
        inboxCategory: IsNull(),
        aiFocusLane: Not(IsNull()),
      },
      order: { receivedAt: "DESC" },
      take: safeLimit,
    });
    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      try {
        const override = await this.resolveInboxCategoryForFrom(
          organizationId,
          row.fromAddress,
        );
        if (override != null) {
          row.inboxCategory = override;
        } else {
          const result = await classify({
            subject: row.subject,
            bodySnippet: row.snippet ?? row.bodyText ?? "",
            fromAddress: row.fromAddress,
          });
          row.inboxCategory = result.category ?? null;
        }
        await this.inboundRepository.save(row);
        updated += 1;
      } catch {
        skipped += 1;
      }
    }
    return { updated, skipped };
  }

  private applyConnectedSourceFilter(
    qb: SelectQueryBuilder<MailInboundMessageEntity>,
    filter: ConnectedInboxSourceFilter,
  ): void {
    if (filter === "all") {
      return;
    }
    if (filter === "lerta") {
      qb.andWhere("m.exchange_sync_account_id IS NULL");
      qb.andWhere("m.gmail_sync_account_id IS NULL");
      return;
    }
    if (filter === "microsoft_graph") {
      qb.andWhere("m.exchange_sync_account_id IS NOT NULL");
      return;
    }
    if (filter === "gmail_api") {
      qb.andWhere("m.gmail_sync_account_id IS NOT NULL");
    }
  }

  private async loadInboxSourceContext(organizationId: string): Promise<{
    lertaLabel: string;
    lertaEmail: string | null;
    exchangeById: Map<string, MailExchangeSyncAccountEntity>;
    gmailById: Map<string, MailGmailSyncAccountEntity>;
  }> {
    const exchangeRows = await this.exchangeSyncAccountRepository.find({
      where: { organizationId },
    });
    const exchangeById = new Map(exchangeRows.map((row) => [row.id, row]));
    const gmailRows = await this.gmailSyncAccountRepository.find({
      where: { organizationId },
    });
    const gmailById = new Map(gmailRows.map((row) => [row.id, row]));
    const sender = await this.senderRepository.findOne({
      where: { organizationId, isDefault: true },
      relations: { mailDomain: true },
    });
    let lertaEmail: string | null = null;
    if (sender?.mailDomain) {
      lertaEmail = resolveMailSenderAddresses(
        sender.localPart,
        sender.mailDomain,
      ).publicAddress;
    }
    return {
      lertaLabel: "Lerta",
      lertaEmail,
      exchangeById,
      gmailById,
    };
  }

  private resolveInboxSource(
    row: MailInboundMessageEntity,
    ctx: {
      lertaLabel: string;
      lertaEmail: string | null;
      exchangeById: Map<string, MailExchangeSyncAccountEntity>;
      gmailById: Map<string, MailGmailSyncAccountEntity>;
    },
  ): MailInboxListRow["inboxSource"] {
    if (row.gmailSyncAccountId) {
      const gmail = ctx.gmailById.get(row.gmailSyncAccountId);
      return {
        provider: "gmail_api",
        accountId: row.gmailSyncAccountId,
        accountEmail: gmail?.emailAddress ?? null,
        label: "Gmail",
      };
    }
    if (row.exchangeSyncAccountId) {
      const account = ctx.exchangeById.get(row.exchangeSyncAccountId);
      return {
        provider: "microsoft_graph",
        accountId: row.exchangeSyncAccountId,
        accountEmail: account?.emailAddress ?? null,
        label: "Microsoft",
      };
    }
    return {
      provider: "lerta",
      accountId: null,
      accountEmail: ctx.lertaEmail,
      label: ctx.lertaLabel,
    };
  }

  private toListRow(
    row: MailInboundMessageEntity,
    ctx: {
      lertaLabel: string;
      lertaEmail: string | null;
      exchangeById: Map<string, MailExchangeSyncAccountEntity>;
      gmailById: Map<string, MailGmailSyncAccountEntity>;
    },
  ): MailInboxListRow {
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject: repairUtf8Mojibake(decodeMimeEncodedWords(row.subject)) ?? row.subject,
      snippet: repairUtf8Mojibake(row.snippet),
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      spamStatus: row.spamStatus,
      spamReason: row.spamReason,
      attachmentCount: row.attachments?.length ?? 0,
      starredAt: row.starredAt?.toISOString() ?? null,
      customFolderId: row.customFolderId,
      aiFocusLane: row.aiFocusLane ?? null,
      inboxCategory: normalizeInboxCategory(row.inboxCategory),
      messageKind: "inbound" as const,
      inboxSource: this.resolveInboxSource(row, ctx),
    };
  }
}
