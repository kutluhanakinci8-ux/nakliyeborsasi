import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { readFileSync } from "node:fs";
import { ILike, In, IsNull, Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  MailInboundAttachmentMeta,
  MailInboundMessageEntity,
} from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";

export type InboxFolder = "inbox" | "spam" | "all";

@Injectable()
export class MailOrganizationInboxService {
  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async getSummary(organizationId: string): Promise<{
    primaryAddress: string | null;
    mailboxId: string | null;
    unreadCount: number;
    totalMessages: number;
    spamCount: number;
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
      };
    }
    const inboxWhere = {
      mailboxId: In(mailboxIds),
      spamStatus: In(["clean", "suspected"]),
    };
    const [totalMessages, unreadCount, spamCount] = await Promise.all([
      this.inboundRepository.count({ where: inboxWhere }),
      this.inboundRepository.count({
        where: { ...inboxWhere, readAt: IsNull() },
      }),
      this.inboundRepository.count({
        where: { mailboxId: In(mailboxIds), spamStatus: "blocked" },
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
    };
  }

  public async listMessages(
    organizationId: string,
    folder: InboxFolder = "inbox",
    limit = 50,
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
      where: this.whereForFolder(mailboxIds, folder),
      order: { receivedAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => this.toListRow(row));
  }

  public async searchMessages(
    organizationId: string,
    query: string,
    folder: InboxFolder = "inbox",
    limit = 50,
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
    const term = query.trim();
    if (term.length < 2) {
      return [];
    }
    const mailboxIds = await this.mailboxIdsForOrganization(organizationId);
    if (mailboxIds.length === 0) {
      return [];
    }
    const baseWhere = this.whereForFolder(mailboxIds, folder);
    const pattern = `%${term.replace(/[%_]/g, "")}%`;
    const rows = await this.inboundRepository.find({
      where: [
        { ...baseWhere, subject: ILike(pattern) },
        { ...baseWhere, fromAddress: ILike(pattern) },
        { ...baseWhere, snippet: ILike(pattern) },
      ],
      order: { receivedAt: "DESC" },
      take: limit,
    });
    const seen = new Set<string>();
    const unique: MailInboundMessageEntity[] = [];
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        unique.push(row);
      }
    }
    return unique.map((row) => this.toListRow(row));
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
    emailAddress: string;
    spamStatus: string;
    spamReason: string | null;
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
      where: this.whereForFolder(mailboxIds, folder),
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
      where: this.whereForFolder(mailboxIds, folder),
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

  private whereForFolder(
    mailboxIds: string[],
    folder: InboxFolder,
  ): Record<string, unknown> {
    if (folder === "spam") {
      return { mailboxId: In(mailboxIds), spamStatus: "blocked" };
    }
    if (folder === "all") {
      return { mailboxId: In(mailboxIds) };
    }
    return {
      mailboxId: In(mailboxIds),
      spamStatus: In(["clean", "suspected"]),
    };
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
    };
  }
}
