import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
import { MailImapMaildirService } from "./MailImapMaildirService";

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

@Injectable()
export class MailOrganizationInboxService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    private readonly mailImapMaildirService: MailImapMaildirService,
  ) {}

  public async getSummary(organizationId: string): Promise<{
    primaryAddress: string | null;
    mailboxId: string | null;
    unreadCount: number;
    totalMessages: number;
    spamCount: number;
    archiveCount: number;
    trashCount: number;
    starredCount: number;
  }> {
    const primaryAddress = await this.resolvePrimaryAddress(organizationId);
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return {
        primaryAddress,
        mailboxId: null,
        unreadCount: 0,
        totalMessages: 0,
        spamCount: 0,
        archiveCount: 0,
        trashCount: 0,
        starredCount: 0,
      };
    }
    const inboxWhere = {
      mailboxId: In(mailboxIds),
      spamStatus: In(["clean", "suspected"]),
      mailboxFolder: "inbox" as const,
    };
    const [
      totalMessages,
      unreadCount,
      spamCount,
      archiveCount,
      trashCount,
      starredCount,
    ] = await Promise.all([
      this.inboundRepository.count({ where: inboxWhere }),
      this.inboundRepository.count({
        where: { ...inboxWhere, readAt: IsNull() },
      }),
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
    ]);
    const mailbox = primaryAddress
      ? await this.mailboxRepository.findOne({
          where: { organizationId, emailAddress: primaryAddress },
        })
      : null;
    return {
      primaryAddress,
      mailboxId: mailbox?.id ?? null,
      unreadCount,
      totalMessages,
      spamCount,
      archiveCount,
      trashCount,
      starredCount,
    };
  }

  public async listMessages(
    organizationId: string,
    folder: InboxFolder = "inbox",
    limit = 50,
    customFolderId?: string | null,
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
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return [];
    }
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    this.applyFolderToQueryBuilder(qb, folder, customFolderId);
    this.applySnoozeListFilter(qb, folder);
    const rows = await qb
      .orderBy("m.receivedAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => this.toListRow(row));
  }

  public async searchMessages(
    organizationId: string,
    folder: InboxFolder = "inbox",
    filters: MailInboxSearchFilters = {},
    limit = 50,
    customFolderId?: string | null,
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
    if (!this.hasSearchCriteria(filters)) {
      return [];
    }
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return [];
    }
    const qb = this.inboundRepository.createQueryBuilder("m");
    qb.where("m.mailboxId IN (:...mailboxIds)", { mailboxIds });
    this.applyFolderToQueryBuilder(qb, folder, customFolderId);
    this.applySnoozeListFilter(qb, folder);

    const term = filters.q?.trim() ?? "";
    if (term.length >= 2) {
      const pattern = `%${term.replace(/[%_]/g, "")}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("m.subject ILIKE :textPattern", { textPattern: pattern })
            .orWhere("m.fromAddress ILIKE :textPattern", { textPattern: pattern })
            .orWhere("m.snippet ILIKE :textPattern", { textPattern: pattern });
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
    return rows.map((row) => this.toListRow(row));
  }

  public async getMessage(
    organizationId: string,
    messageId: string,
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
  }> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    const mailbox = await this.mailboxRepository.findOne({
      where: { id: row.mailboxId },
    });
    let bodyText = row.bodyText;
    if (!bodyText && row.rawMimePath) {
      try {
        bodyText = readFileSync(row.rawMimePath, "utf8").slice(0, 200_000);
      } catch {
        bodyText = row.snippet;
      }
    }
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: bodyText ?? row.snippet,
      bodyHtml: row.bodyHtml,
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      emailAddress: mailbox?.emailAddress ?? "—",
      spamStatus: row.spamStatus,
      spamReason: row.spamReason,
      mailboxFolder: row.mailboxFolder ?? "inbox",
      starredAt: row.starredAt?.toISOString() ?? null,
      attachments: (row.attachments ?? []).map((file, index) => ({
        index,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
      })),
    };
  }

  public async getAttachment(
    organizationId: string,
    messageId: string,
    index: number,
  ): Promise<{ file: MailInboundAttachmentMeta; buffer: Buffer }> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    const file = row.attachments?.[index];
    if (!file) {
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
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return [];
    }
    const rows = await this.inboundRepository.find({
      where: this.whereForFolder(mailboxIds, folder, customFolderId),
      order: { receivedAt: "DESC" },
      take: 300,
    });
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
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
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
    return inThread.map((row) => this.toListRow(row));
  }

  public async markRead(
    organizationId: string,
    messageId: string,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    if (!row.readAt) {
      row.readAt = new Date();
      await this.inboundRepository.save(row);
    }
  }

  public async setStarred(
    organizationId: string,
    messageId: string,
    starred: boolean,
  ): Promise<{ starredAt: string | null }> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    if (row.mailboxFolder === "trash") {
      throw new ForbiddenException("Çöp kutusundaki mesaj yıldızlanamaz.");
    }
    row.starredAt = starred ? new Date() : null;
    await this.inboundRepository.save(row);
    return { starredAt: row.starredAt?.toISOString() ?? null };
  }

  public async markUnread(
    organizationId: string,
    messageId: string,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    if (row.readAt) {
      row.readAt = null;
      await this.inboundRepository.save(row);
    }
  }

  public async bulkMarkRead(
    organizationId: string,
    messageIds: string[],
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId);
      if (!row.readAt) {
        row.readAt = new Date();
        await this.inboundRepository.save(row);
        updated += 1;
      }
    }
    return { updated };
  }

  public async bulkMarkUnread(
    organizationId: string,
    messageIds: string[],
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId);
      if (row.readAt) {
        row.readAt = null;
        await this.inboundRepository.save(row);
        updated += 1;
      }
    }
    return { updated };
  }

  public async bulkSetMailboxFolder(
    organizationId: string,
    messageIds: string[],
    folder: MailboxFolder,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      await this.setMailboxFolder(organizationId, messageId, folder);
      updated += 1;
    }
    return { updated };
  }

  public async bulkSetStarred(
    organizationId: string,
    messageIds: string[],
    starred: boolean,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const messageId of messageIds) {
      const row = await this.assertMessageAccess(organizationId, messageId);
      if (row.mailboxFolder === "trash") {
        continue;
      }
      const wasStarred = row.starredAt !== null;
      if (starred && !wasStarred) {
        row.starredAt = new Date();
        await this.inboundRepository.save(row);
        updated += 1;
      } else if (!starred && wasStarred) {
        row.starredAt = null;
        await this.inboundRepository.save(row);
        updated += 1;
      }
    }
    return { updated };
  }

  public async setMailboxFolder(
    organizationId: string,
    messageId: string,
    folder: MailboxFolder,
  ): Promise<{ mailboxFolder: MailboxFolder }> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    if (row.mailboxFolder === folder) {
      return { mailboxFolder: folder };
    }
    row.maildirFilePath = this.mailImapMaildirService.relocateMailboxFile(
      row.maildirFilePath,
      folder,
    );
    row.mailboxFolder = folder;
    if (folder !== "inbox") {
      row.customFolderId = null;
    }
    await this.inboundRepository.save(row);
    return { mailboxFolder: folder };
  }

  public async deleteMessagePermanently(
    organizationId: string,
    messageId: string,
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    if (row.mailboxFolder !== "trash") {
      throw new ForbiddenException(
        "Kalıcı silme yalnızca çöp kutusundaki mesajlar için geçerlidir.",
      );
    }
    this.mailImapMaildirService.deleteMailboxFile(row.maildirFilePath);
    await this.inboundRepository.remove(row);
  }

  private async assertMessageAccess(
    organizationId: string,
    messageId: string,
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
  ): Promise<{ snoozedUntil: string }> {
    const row = await this.assertMessageAccess(organizationId, messageId);
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
  ): Promise<void> {
    const row = await this.assertMessageAccess(organizationId, messageId);
    row.snoozedUntil = null;
    await this.inboundRepository.save(row);
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

  private async mailboxIdsForOrganization(
    organizationId: string,
  ): Promise<string[]> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    return mailboxes.map((m) => m.id);
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
    return `${sender.localPart}@${sender.mailDomain.domain}`;
  }

  private resolveThreadRootId(
    row: MailInboundMessageEntity,
    byInternetId: Map<string, MailInboundMessageEntity>,
  ): string {
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

  private toListRow(row: MailInboundMessageEntity) {
    return {
      id: row.id,
      fromAddress: row.fromAddress,
      subject: row.subject,
      snippet: row.snippet,
      receivedAt: row.receivedAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      spamStatus: row.spamStatus,
      spamReason: row.spamReason,
      attachmentCount: row.attachments?.length ?? 0,
      starredAt: row.starredAt?.toISOString() ?? null,
      customFolderId: row.customFolderId,
    };
  }
}
