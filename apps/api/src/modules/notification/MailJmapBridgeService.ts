import { BadRequestException, Injectable } from "@nestjs/common";
import {
  InboxFolder,
  MailOrganizationInboxService,
  MailboxFolder,
} from "./MailOrganizationInboxService";

const CORE = "urn:ietf:params:jmap:core";
const MAIL = "urn:ietf:params:jmap:mail";

const VIRTUAL_MAILBOX_IDS = [
  "inbox",
  "archive",
  "trash",
  "spam",
  "starred",
] as const;
type VirtualMailboxId = (typeof VIRTUAL_MAILBOX_IDS)[number];

type JmapMethodCall = [string, Record<string, unknown>, string];
type JmapRequestBody = {
  using?: string[];
  methodCalls?: JmapMethodCall[];
};

@Injectable()
export class MailJmapBridgeService {
  public constructor(
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
  ) {}

  public buildSession(params: {
    organizationId: string;
    username: string;
    apiUrl: string;
  }) {
    const accountId = params.organizationId;
    return {
      capabilities: {
        [CORE]: {
          maxSizeUpload: 0,
          maxConcurrentUpload: 0,
          maxSizeRequest: 10_000_000,
          maxConcurrentRequests: 8,
          maxCallsInRequest: 32,
          maxObjectsInGet: 50,
          maxObjectsInSet: 50,
        },
        [MAIL]: {},
      },
      accounts: {
        [accountId]: {
          name: params.username,
          isPersonal: true,
          isReadOnly: false,
          accountCapabilities: {
            [MAIL]: {
              maxSizeMailboxName: 256,
              maxSizeAttachmentsPerEmail: 32,
              emailQuerySortOptions: ["receivedAt"],
              mayCreateTopLevelMailbox: false,
            },
          },
        },
      },
      primaryAccounts: {
        [MAIL]: accountId,
      },
      username: params.username,
      apiUrl: params.apiUrl,
      downloadUrl: params.apiUrl,
      uploadUrl: params.apiUrl,
      state: this.sessionState(accountId),
    };
  }

  public async processMethodCalls(
    organizationId: string,
    body: JmapRequestBody,
  ): Promise<{ methodResponses: unknown[]; sessionState: string }> {
    const using = body.using ?? [];
    if (!using.includes(CORE)) {
      throw new BadRequestException(`JMAP isteği ${CORE} capability gerektirir.`);
    }
    const calls = body.methodCalls ?? [];
    const methodResponses: unknown[] = [];
    for (const call of calls) {
      if (!Array.isArray(call) || call.length < 3) {
        throw new BadRequestException("Geçersiz methodCalls girdisi.");
      }
      const [method, args, clientCallId] = call;
      if (typeof method !== "string" || typeof clientCallId !== "string") {
        throw new BadRequestException("Geçersiz JMAP method çağrısı.");
      }
      const accountId =
        typeof args.accountId === "string" ? args.accountId : organizationId;
      if (accountId !== organizationId) {
        methodResponses.push([
          "error",
          { type: "forbidden", description: "accountId uyuşmuyor" },
          clientCallId,
        ]);
        continue;
      }
      try {
        const result = await this.dispatchMethod(
          organizationId,
          method,
          args as Record<string, unknown>,
        );
        methodResponses.push([method, result, clientCallId]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "JMAP method hatası";
        methodResponses.push([
          "error",
          { type: "serverFail", description: message },
          clientCallId,
        ]);
      }
    }
    return {
      methodResponses,
      sessionState: this.sessionState(organizationId),
    };
  }

  private sessionState(organizationId: string): string {
    return `lerta-mail-${organizationId}`;
  }

  private async dispatchMethod(
    organizationId: string,
    method: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (method) {
      case "Email/query":
        return await this.emailQuery(organizationId, args);
      case "Email/get":
        return await this.emailGet(organizationId, args);
      case "Email/set":
        return await this.emailSet(organizationId, args);
      case "Mailbox/get":
        return await this.mailboxGet(organizationId, args);
      case "Mailbox/query":
        return await this.mailboxQuery(organizationId, args);
      default:
        throw new BadRequestException(`Desteklenmeyen JMAP method: ${method}`);
    }
  }

  private async mailboxQuery(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const mailboxes = await this.buildVirtualMailboxes(organizationId);
    const filterIds = this.readMailboxFilterIds(args.filter);
    let ids = mailboxes.map((mb) => mb.id);
    if (filterIds.length > 0) {
      const allowed = new Set(filterIds);
      ids = ids.filter((id) => allowed.has(id));
    }
    const limit = Math.min(
      Math.max(typeof args.limit === "number" ? args.limit : 50, 1),
      50,
    );
    ids = ids.slice(0, limit);
    return {
      accountId: organizationId,
      queryState: `mbq-${ids.length}`,
      canCalculateChanges: false,
      position: 0,
      total: ids.length,
      ids,
    };
  }

  private async mailboxGet(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const requestedIds = Array.isArray(args.ids)
      ? args.ids.filter((id): id is string => typeof id === "string")
      : [];
    const mailboxes = await this.buildVirtualMailboxes(organizationId);
    const byId = new Map<string, Record<string, unknown>>(
      mailboxes.map((mb) => [mb.id, mb]),
    );
    const list: Record<string, unknown>[] = [];
    const notFound: string[] = [];
    for (const id of requestedIds.slice(0, 50)) {
      const row = byId.get(id);
      if (row) {
        list.push(row);
      } else {
        notFound.push(id);
      }
    }
    return {
      accountId: organizationId,
      state: `mbg-${list.length}`,
      list,
      notFound,
    };
  }

  private async buildVirtualMailboxes(organizationId: string) {
    const summary =
      await this.mailOrganizationInboxService.getSummary(organizationId);
    const defs: {
      id: VirtualMailboxId;
      name: string;
      role: string | null;
      totalEmails: number;
      unreadEmails: number;
    }[] = [
      {
        id: "inbox",
        name: "Gelen Kutusu",
        role: "inbox",
        totalEmails: summary.totalMessages,
        unreadEmails: summary.unreadCount,
      },
      {
        id: "archive",
        name: "Arşiv",
        role: "archive",
        totalEmails: summary.archiveCount,
        unreadEmails: 0,
      },
      {
        id: "trash",
        name: "Çöp",
        role: "trash",
        totalEmails: summary.trashCount,
        unreadEmails: 0,
      },
      {
        id: "spam",
        name: "Spam",
        role: "junk",
        totalEmails: summary.spamCount,
        unreadEmails: 0,
      },
      {
        id: "starred",
        name: "Yıldızlı",
        role: null,
        totalEmails: summary.starredCount,
        unreadEmails: 0,
      },
    ];
    return defs.map((def) => ({
      id: def.id,
      name: def.name,
      role: def.role,
      sortOrder: this.mailboxSortOrder(def.id),
      totalEmails: def.totalEmails,
      unreadEmails: def.unreadEmails,
      totalThreads: def.totalEmails,
      unreadThreads: def.unreadEmails,
      isSubscribed: true,
      parentId: null,
    }));
  }

  private mailboxSortOrder(id: VirtualMailboxId): number {
    const order: Record<VirtualMailboxId, number> = {
      inbox: 1,
      starred: 2,
      archive: 3,
      spam: 4,
      trash: 5,
    };
    return order[id];
  }

  private readMailboxFilterIds(filter: unknown): string[] {
    if (!filter || typeof filter !== "object") {
      return [];
    }
    const ids = (filter as { ids?: string[] }).ids;
    if (!Array.isArray(ids)) {
      return [];
    }
    return ids.filter((id): id is string => typeof id === "string");
  }

  private async emailQuery(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const limit = Math.min(
      Math.max(typeof args.limit === "number" ? args.limit : 50, 1),
      100,
    );
    const folder = this.resolveMailboxFolder(args.filter);
    const text = this.readFilterText(args.filter);
    const rows =
      text.length >= 2
        ? await this.mailOrganizationInboxService.searchMessages(
            organizationId,
            folder,
            { q: text },
            limit,
          )
        : await this.mailOrganizationInboxService.listMessages(
            organizationId,
            folder,
            limit,
          );
    const ids = rows.map((row) => row.id);
    return {
      accountId: organizationId,
      queryState: `q-${folder}-${rows.length}`,
      canCalculateChanges: false,
      position: 0,
      total: rows.length,
      ids,
    };
  }

  private async emailGet(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const ids = Array.isArray(args.ids)
      ? args.ids.filter((id): id is string => typeof id === "string")
      : [];
    const list: Record<string, unknown>[] = [];
    const notFound: string[] = [];
    for (const id of ids.slice(0, 50)) {
      try {
        const message = await this.mailOrganizationInboxService.getMessage(
          organizationId,
          id,
        );
        list.push(this.toJmapEmail(message));
      } catch {
        notFound.push(id);
      }
    }
    return {
      accountId: organizationId,
      state: `get-${list.length}`,
      list,
      notFound,
    };
  }

  private toJmapEmail(message: {
    id: string;
    fromAddress: string;
    subject: string;
    snippet: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    receivedAt: string;
    readAt: string | null;
    starredAt: string | null;
    toRecipients: string[];
    ccRecipients: string[];
    spamStatus: string;
    mailboxFolder: MailboxFolder;
    attachments: {
      index: number;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }[];
  }): Record<string, unknown> {
    const mailboxId = this.resolveMessageMailboxId(
      message.mailboxFolder,
      message.spamStatus,
    );
    const keywords: Record<string, boolean> = {};
    if (message.readAt) {
      keywords.$seen = true;
    }
    if (message.starredAt) {
      keywords.$flagged = true;
    }
    const bodyValues: Record<string, { value: string }> = {};
    const textBody: { partId: string; type: string }[] = [];
    const htmlBody: { partId: string; type: string }[] = [];
    const text = message.bodyText ?? message.snippet ?? "";
    if (text) {
      bodyValues["1"] = { value: text };
      textBody.push({ partId: "1", type: "text/plain" });
    }
    if (message.bodyHtml) {
      bodyValues["2"] = { value: message.bodyHtml };
      htmlBody.push({ partId: "2", type: "text/html" });
    }
    return {
      id: message.id,
      blobId: message.id,
      threadId: message.id,
      mailboxIds: { [mailboxId]: true },
      from: [{ email: message.fromAddress }],
      to: message.toRecipients.map((email) => ({ email })),
      cc: message.ccRecipients.map((email) => ({ email })),
      subject: message.subject,
      receivedAt: message.receivedAt,
      preview: message.snippet,
      hasAttachment: message.attachments.length > 0,
      keywords,
      bodyValues,
      textBody,
      htmlBody,
      attachments: message.attachments.map((file) => ({
        partId: `att-${file.index}`,
        blobId: `${message.id}-att-${file.index}`,
        type: file.contentType,
        name: file.filename,
        size: file.sizeBytes,
      })),
    };
  }

  private resolveMessageMailboxId(
    mailboxFolder: MailboxFolder,
    spamStatus: string,
  ): VirtualMailboxId {
    if (spamStatus === "blocked") {
      return "spam";
    }
    if (mailboxFolder === "archive") {
      return "archive";
    }
    if (mailboxFolder === "trash") {
      return "trash";
    }
    return "inbox";
  }

  private async emailSet(
    organizationId: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const update =
      args.update && typeof args.update === "object"
        ? (args.update as Record<string, Record<string, unknown>>)
        : {};
    const destroy = Array.isArray(args.destroy)
      ? args.destroy.filter((id): id is string => typeof id === "string")
      : [];
    if (args.create && typeof args.create === "object") {
      const keys = Object.keys(args.create as object);
      if (keys.length > 0) {
        throw new BadRequestException(
          "Email oluşturma desteklenmiyor; gönderim için REST compose kullanın.",
        );
      }
    }

    const updated: Record<string, null> = {};
    const notUpdated: Record<string, { type: string; description: string }> =
      {};
    const destroyed: string[] = [];
    const notDestroyed: Record<string, { type: string; description: string }> =
      {};

    for (const [messageId, patch] of Object.entries(update)) {
      try {
        await this.applyEmailPatch(organizationId, messageId, patch);
        updated[messageId] = null;
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Güncelleme başarısız";
        notUpdated[messageId] = { type: "invalidProperties", description };
      }
    }

    for (const messageId of destroy.slice(0, 50)) {
      try {
        await this.mailOrganizationInboxService.deleteMessagePermanently(
          organizationId,
          messageId,
        );
        destroyed.push(messageId);
      } catch (error) {
        const description =
          error instanceof Error ? error.message : "Silme başarısız";
        notDestroyed[messageId] = { type: "invalidProperties", description };
      }
    }

    const changeCount = Object.keys(updated).length + destroyed.length;
    return {
      accountId: organizationId,
      oldState: `set-before-${changeCount}`,
      newState: `set-after-${changeCount}`,
      updated,
      notUpdated,
      notCreated: {},
      destroyed,
      notDestroyed,
    };
  }

  private async applyEmailPatch(
    organizationId: string,
    messageId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    if (patch.keywords && typeof patch.keywords === "object") {
      const keywords = patch.keywords as Record<string, boolean | null>;
      if (keywords.$seen === true) {
        await this.mailOrganizationInboxService.markRead(
          organizationId,
          messageId,
        );
      } else if (keywords.$seen === false || keywords.$seen === null) {
        await this.mailOrganizationInboxService.markUnread(
          organizationId,
          messageId,
        );
      }
      if (keywords.$flagged === true) {
        await this.mailOrganizationInboxService.setStarred(
          organizationId,
          messageId,
          true,
        );
      } else if (keywords.$flagged === false || keywords.$flagged === null) {
        await this.mailOrganizationInboxService.setStarred(
          organizationId,
          messageId,
          false,
        );
      }
    }

    if (patch.mailboxIds && typeof patch.mailboxIds === "object") {
      const target = this.resolveTargetMailboxFromPatch(
        patch.mailboxIds as Record<string, boolean | null>,
      );
      if (target) {
        await this.applyVirtualMailboxMove(
          organizationId,
          messageId,
          target,
        );
      }
    }
  }

  private resolveTargetMailboxFromPatch(
    mailboxIds: Record<string, boolean | null>,
  ): VirtualMailboxId | null {
    for (const id of VIRTUAL_MAILBOX_IDS) {
      if (mailboxIds[id] === true) {
        return id;
      }
    }
    for (const [rawId, value] of Object.entries(mailboxIds)) {
      if (value === true && this.isVirtualMailboxId(rawId)) {
        return rawId;
      }
    }
    return null;
  }

  private isVirtualMailboxId(id: string): id is VirtualMailboxId {
    return (VIRTUAL_MAILBOX_IDS as readonly string[]).includes(id);
  }

  private async applyVirtualMailboxMove(
    organizationId: string,
    messageId: string,
    target: VirtualMailboxId,
  ): Promise<void> {
    if (target === "starred") {
      await this.mailOrganizationInboxService.setStarred(
        organizationId,
        messageId,
        true,
      );
      return;
    }
    if (target === "spam") {
      await this.mailOrganizationInboxService.setInboundSpamStatus(
        organizationId,
        messageId,
        true,
      );
      return;
    }
    if (target === "inbox") {
      await this.mailOrganizationInboxService.setInboundSpamStatus(
        organizationId,
        messageId,
        false,
      );
      await this.mailOrganizationInboxService.setMailboxFolder(
        organizationId,
        messageId,
        "inbox",
      );
      return;
    }
    if (target === "archive" || target === "trash") {
      await this.mailOrganizationInboxService.setInboundSpamStatus(
        organizationId,
        messageId,
        false,
      );
      await this.mailOrganizationInboxService.setMailboxFolder(
        organizationId,
        messageId,
        target,
      );
    }
  }

  private resolveMailboxFolder(filter: unknown): InboxFolder {
    if (!filter || typeof filter !== "object") {
      return "inbox";
    }
    const inMailbox = (filter as { inMailbox?: string }).inMailbox;
    if (inMailbox === "trash") {
      return "trash";
    }
    if (inMailbox === "archive") {
      return "archive";
    }
    if (inMailbox === "spam") {
      return "spam";
    }
    if (inMailbox === "starred") {
      return "starred";
    }
    return "inbox";
  }

  private readFilterText(filter: unknown): string {
    if (!filter || typeof filter !== "object") {
      return "";
    }
    const text = (filter as { text?: string }).text;
    return typeof text === "string" ? text.trim() : "";
  }
}
