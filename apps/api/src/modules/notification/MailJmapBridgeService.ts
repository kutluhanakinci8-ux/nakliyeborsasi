import { BadRequestException, Injectable } from "@nestjs/common";
import {
  InboxFolder,
  MailOrganizationInboxService,
} from "./MailOrganizationInboxService";

const CORE = "urn:ietf:params:jmap:core";
const MAIL = "urn:ietf:params:jmap:mail";

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
        [CORE]: {},
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
              maxSizeAttachmentsPerEmail: 3,
              emailQuerySortOptions: ["receivedAt"],
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
      state: `lerta-mail-${accountId}`,
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
      sessionState: `lerta-mail-${organizationId}`,
    };
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
      default:
        throw new BadRequestException(`Desteklenmeyen JMAP method: ${method}`);
    }
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
        list.push({
          id: message.id,
          blobId: message.id,
          threadId: message.id,
          mailboxIds: [organizationId],
          from: [{ email: message.fromAddress }],
          to: message.toRecipients.map((email) => ({ email })),
          cc: message.ccRecipients.map((email) => ({ email })),
          subject: message.subject,
          receivedAt: message.receivedAt,
          preview: message.snippet,
          hasAttachment: message.attachments.length > 0,
          keywords: message.starredAt ? { $seen: true } : {},
        });
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
