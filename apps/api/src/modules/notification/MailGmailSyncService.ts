import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailGmailSyncAccountEntity } from "../../infrastructure/database/entities/MailGmailSyncAccountEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import {
  MailInboundAttachmentMeta,
  MailInboundMessageEntity,
} from "../../infrastructure/database/entities/MailInboundMessageEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";
import { MailConnectedAccountsService } from "./MailConnectedAccountsService";
import { buildOutgoingSentMime } from "./MailSentMimeBuilder";
import { randomUUID } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email openid";

const GMAIL_SYNC_LABELS: ReadonlyArray<{
  labelId: string;
  folderKey: string;
}> = [
  { labelId: "INBOX", folderKey: "inbox" },
  { labelId: "SENT", folderKey: "sentitems" },
  { labelId: "DRAFT", folderKey: "drafts" },
  { labelId: "TRASH", folderKey: "deleteditems" },
  { labelId: "SPAM", folderKey: "junkemail" },
];

export type MailGmailSyncAccountDto = {
  id: string;
  emailAddress: string;
  displayName: string | null;
  enabled: boolean;
  mailboxId: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
};

@Injectable()
export class MailGmailSyncService {
  private readonly logger = new Logger(MailGmailSyncService.name);

  public constructor(
    @InjectRepository(MailGmailSyncAccountEntity)
    private readonly accountRepository: Repository<MailGmailSyncAccountEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    private readonly configService: ConfigService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
    private readonly mailConnectedAccountsService: MailConnectedAccountsService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.clientId() && this.clientSecret() && this.redirectUri());
  }

  public isPushConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("GOOGLE_GMAIL_PUBSUB_TOPIC")?.trim(),
    );
  }

  public buildOAuthStart(actor: AuthenticatedUserContext): {
    authorizationUrl: string;
    state: string;
  } {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Gmail senkronu için GOOGLE_GMAIL_CLIENT_ID ve GOOGLE_GMAIL_CLIENT_SECRET tanımlayın.",
      );
    }
    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({
      companyId: actor.companyId,
      userId: actor.userId,
      nonce,
      ts: Date.now(),
      kind: "gmail_mail",
    });
    const state = encryptCalendarCredential(statePayload, this.configService);
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", this.clientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri());
    url.searchParams.set("scope", GMAIL_SCOPE);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return { authorizationUrl: url.toString(), state };
  }

  public async completeOAuth(
    actor: AuthenticatedUserContext,
    code: string,
    state: string,
  ): Promise<MailGmailSyncAccountDto> {
    if (!code.trim() || !state.trim()) {
      throw new BadRequestException("OAuth kodu veya state eksik.");
    }
    const parsed = this.parseOAuthState(state, actor);
    const tokens = await this.exchangeCodeForTokens(code.trim());
    const profile = await this.fetchGoogleEmail(tokens.accessToken);
    const email = profile.email.toLowerCase();
    let account = await this.accountRepository.findOne({
      where: { organizationId: actor.companyId, emailAddress: email },
    });
    if (!account) {
      const canAdd = await this.mailConnectedAccountsService.canAddConnectedAccount(
        actor.companyId,
      );
      if (!canAdd) {
        throw new BadRequestException(
          "Bağlı hesap limitine ulaşıldı veya premium kapalı.",
        );
      }
      account = this.accountRepository.create({
        organizationId: actor.companyId,
        connectedByUserId: actor.userId,
        emailAddress: email,
      });
    }
    account.googleUserId = profile.sub ?? null;
    account.displayName = profile.name ?? null;
    account.refreshTokenCiphertext = encryptCalendarCredential(
      tokens.refreshToken,
      this.configService,
    );
    account.accessTokenCiphertext = encryptCalendarCredential(
      tokens.accessToken,
      this.configService,
    );
    account.accessTokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    account.enabled = true;
    account.lastSyncError = null;
    if (!account.mailboxId) {
      const mailbox = await this.mailboxRepository.save(
        this.mailboxRepository.create({
          organizationId: actor.companyId,
          emailAddress: `gmail+${email}`,
          status: "active",
          accessMode: "delegates_only",
          ownerUserId: actor.userId,
        }),
      );
      account.mailboxId = mailbox.id;
    }
    account = await this.accountRepository.save(account);
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.GmailSyncConnected,
      metadata: { accountId: account.id, emailAddress: email },
    });
    await this.syncAccount(actor.companyId, account.id, actor.userId);
    const refreshed = await this.accountRepository.findOne({
      where: { id: account.id },
    });
    return this.toDto(refreshed ?? account);
  }

  public async listAccounts(
    organizationId: string,
  ): Promise<MailGmailSyncAccountDto[]> {
    const rows = await this.accountRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async deleteAccount(
    actor: AuthenticatedUserContext,
    accountId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId: actor.companyId },
    });
    if (!account) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    await this.accountRepository.remove(account);
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.GmailSyncDisconnected,
      metadata: { accountId, emailAddress: account.emailAddress },
    });
  }

  public async syncAccount(
    organizationId: string,
    accountId: string,
    actorUserId: string | null,
  ): Promise<{ imported: number; updated: number }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId },
    });
    if (!account?.enabled || !account.mailboxId) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    let imported = 0;
    let updated = 0;
    try {
      const profile = await this.gmailGet(accessToken, `${GMAIL_BASE}/profile`);
      const previousHistoryId = account.historyId;
      if (typeof profile.historyId === "string") {
        account.historyId = profile.historyId;
      }
      if (previousHistoryId) {
        const delta = await this.syncHistoryDelta(
          accessToken,
          account,
          previousHistoryId,
        );
        imported += delta.imported;
        updated += delta.updated;
      }
      for (const label of GMAIL_SYNC_LABELS) {
        const list = await this.gmailGet(
          accessToken,
          `${GMAIL_BASE}/messages?labelIds=${label.labelId}&maxResults=50`,
        );
        const ids = (list.messages ?? []) as Array<{ id?: string }>;
        for (const ref of ids) {
          if (!ref.id) {
            continue;
          }
          const full = await this.gmailGet(
            accessToken,
            `${GMAIL_BASE}/messages/${ref.id}?format=full`,
          );
          const result = await this.upsertGmailMessage(
            account,
            full as GmailMessage,
            label.folderKey,
          );
          if (result === "imported") {
            imported += 1;
          } else if (result === "updated") {
            updated += 1;
          }
        }
      }
      account.lastSyncedAt = new Date();
      account.lastSyncError = null;
      await this.accountRepository.save(account);
      void this.registerGmailWatch(account, accessToken).catch(() => undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gmail senkron hatası";
      account.lastSyncError = message.slice(0, 500);
      await this.accountRepository.save(account);
      this.logger.warn(`Gmail sync failed for ${account.id}: ${message}`);
      throw error;
    }
    void actorUserId;
    return { imported, updated };
  }

  public async syncAllForOrganization(
    organizationId: string,
    actorUserId: string,
  ): Promise<{ accounts: number; imported: number; updated: number }> {
    const accounts = await this.accountRepository.find({
      where: { organizationId, enabled: true },
    });
    let imported = 0;
    let updated = 0;
    for (const account of accounts) {
      try {
        const result = await this.syncAccount(
          organizationId,
          account.id,
          actorUserId,
        );
        imported += result.imported;
        updated += result.updated;
      } catch {
        /* continue */
      }
    }
    return { accounts: accounts.length, imported, updated };
  }

  public async pushReadStateToGmail(
    organizationId: string,
    gmailSyncAccountId: string,
    gmailMessageId: string,
    isRead: boolean,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: gmailSyncAccountId, organizationId },
    });
    if (!account?.enabled) {
      return;
    }
    try {
      const accessToken = await this.resolveAccessToken(account);
      await this.gmailPost(accessToken, `${GMAIL_BASE}/messages/batchModify`, {
        ids: [gmailMessageId],
        removeLabelIds: isRead ? ["UNREAD"] : [],
        addLabelIds: isRead ? [] : ["UNREAD"],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gmail okundu güncellenemedi";
      this.logger.warn(`Gmail read sync failed ${gmailMessageId}: ${message}`);
    }
  }

  public async fetchAttachmentBytes(
    organizationId: string,
    gmailSyncAccountId: string,
    gmailMessageId: string,
    gmailAttachmentId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const account = await this.accountRepository.findOne({
      where: { id: gmailSyncAccountId, organizationId },
    });
    if (!account?.enabled) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    const meta = await this.gmailGet(
      accessToken,
      `${GMAIL_BASE}/messages/${gmailMessageId}/attachments/${gmailAttachmentId}`,
    );
    const data = typeof meta.data === "string" ? meta.data : "";
    const buffer = Buffer.from(data, "base64url");
    return { buffer, contentType: "application/octet-stream" };
  }

  public async searchMessages(
    organizationId: string,
    accountId: string,
    query: string,
    limit = 15,
  ): Promise<
    Array<{
      id: string;
      subject: string;
      fromAddress: string;
      receivedAt: string | null;
      snippet: string | null;
    }>
  > {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return [];
    }
    const accessToken = await this.resolveAccessToken(account);
    const list = await this.gmailGet(
      accessToken,
      `${GMAIL_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${Math.min(limit, 25)}`,
    );
    const refs = (list.messages ?? []) as Array<{ id?: string }>;
    const hits: Array<{
      id: string;
      subject: string;
      fromAddress: string;
      receivedAt: string | null;
      snippet: string | null;
    }> = [];
    for (const ref of refs) {
      if (!ref.id) {
        continue;
      }
      const meta = await this.gmailGet(
        accessToken,
        `${GMAIL_BASE}/messages/${ref.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      );
      const headers = (meta.payload as { headers?: GmailHeader[] })?.headers ?? [];
      hits.push({
        id: ref.id,
        subject: headerValue(headers, "Subject")?.trim() || "(Konu yok)",
        fromAddress:
          headerValue(headers, "From")?.match(/<([^>]+)>/)?.[1] ??
          headerValue(headers, "From") ??
          "unknown",
        receivedAt: headerValue(headers, "Date"),
        snippet: typeof meta.snippet === "string" ? meta.snippet.slice(0, 300) : null,
      });
    }
    return hits;
  }

  public async upsertDraftMessage(
    organizationId: string,
    accountId: string,
    params: {
      providerDraftId: string | null;
      to: string | null;
      subject: string | null;
      text: string | null;
    },
  ): Promise<string> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    const fromHeader = account.displayName
      ? `${account.displayName} <${account.emailAddress}>`
      : account.emailAddress;
    const rawMime = buildOutgoingSentMime({
      fromHeader,
      to: params.to?.trim() || "",
      subject: params.subject?.trim() || "(Konu yok)",
      text: params.text ?? "",
      messageId: `<${randomUUID()}@lerta.draft>`,
      date: new Date(),
    });
    const raw = Buffer.from(rawMime).toString("base64url");
    if (params.providerDraftId) {
      await this.gmailPut(
        accessToken,
        `${GMAIL_BASE}/drafts/${params.providerDraftId}`,
        { message: { raw } },
      );
      return params.providerDraftId;
    }
    const created = await this.gmailPost(accessToken, `${GMAIL_BASE}/drafts`, {
      message: { raw },
    });
    const draftId = typeof created.id === "string" ? created.id : null;
    if (!draftId) {
      throw new BadRequestException("Gmail taslak oluşturulamadı.");
    }
    return draftId;
  }

  public async moveMessageToTrash(
    organizationId: string,
    accountId: string,
    gmailMessageId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    await this.gmailPost(
      accessToken,
      `${GMAIL_BASE}/messages/${gmailMessageId}/trash`,
      {},
    );
  }

  public async archiveMessage(
    organizationId: string,
    accountId: string,
    gmailMessageId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    await this.gmailPost(
      accessToken,
      `${GMAIL_BASE}/messages/${gmailMessageId}/modify`,
      { removeLabelIds: ["INBOX"] },
    );
  }

  public async moveMessageToInbox(
    organizationId: string,
    accountId: string,
    gmailMessageId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    await this.gmailPost(
      accessToken,
      `${GMAIL_BASE}/messages/${gmailMessageId}/modify`,
      { addLabelIds: ["INBOX"] },
    );
  }

  public async untrashMessage(
    organizationId: string,
    accountId: string,
    gmailMessageId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    await this.gmailPost(
      accessToken,
      `${GMAIL_BASE}/messages/${gmailMessageId}/untrash`,
      {},
    );
  }

  public async deleteMessagePermanently(
    organizationId: string,
    accountId: string,
    gmailMessageId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    const response = await fetch(`${GMAIL_BASE}/messages/${gmailMessageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new BadRequestException(
        `Gmail kalıcı silme başarısız (${response.status}): ${text.slice(0, 120)}`,
      );
    }
  }

  public async deleteDraftMessage(
    organizationId: string,
    accountId: string,
    providerDraftId: string,
  ): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      return;
    }
    const accessToken = await this.resolveAccessToken(account);
    const response = await fetch(`${GMAIL_BASE}/drafts/${providerDraftId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new BadRequestException(
        `Gmail taslak silinemedi (${response.status}): ${text.slice(0, 120)}`,
      );
    }
  }

  public async importMessageById(
    organizationId: string,
    accountId: string,
    providerMessageId: string,
  ): Promise<{ localMessageId: string }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account?.mailboxId) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    const full = await this.gmailGet(
      accessToken,
      `${GMAIL_BASE}/messages/${providerMessageId}?format=full`,
    );
    const labelIds = (full.labelIds ?? []) as string[];
    const folderKey = resolveGmailFolderKeyFromLabels(labelIds);
    await this.upsertGmailMessage(
      account,
      full as GmailMessage,
      folderKey,
    );
    const local = await this.inboundRepository.findOne({
      where: {
        gmailSyncAccountId: account.id,
        gmailMessageId: providerMessageId,
      },
    });
    if (!local) {
      throw new NotFoundException("Mesaj içe aktarılamadı.");
    }
    return { localMessageId: local.id };
  }

  private async syncHistoryDelta(
    accessToken: string,
    account: MailGmailSyncAccountEntity,
    startHistoryId: string,
  ): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated = 0;
    const history = await this.gmailGet(
      accessToken,
      `${GMAIL_BASE}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&historyTypes=messageDeleted&historyTypes=labelsAdded&historyTypes=labelsRemoved`,
    );
    const records = (history.history ?? []) as Array<{
      messagesAdded?: Array<{ message?: { id?: string } }>;
      messagesDeleted?: Array<{ message?: { id?: string } }>;
      labelsAdded?: Array<{ message?: { id?: string }; labelIds?: string[] }>;
      labelsRemoved?: Array<{ message?: { id?: string }; labelIds?: string[] }>;
    }>;
    for (const record of records) {
      for (const deleted of record.messagesDeleted ?? []) {
        if (!deleted.message?.id) {
          continue;
        }
        const local = await this.inboundRepository.findOne({
          where: {
            gmailSyncAccountId: account.id,
            gmailMessageId: deleted.message.id,
          },
        });
        if (local) {
          local.mailboxFolder = "trash";
          await this.inboundRepository.save(local);
          updated += 1;
        }
      }
      for (const labelChange of [
        ...(record.labelsAdded ?? []),
        ...(record.labelsRemoved ?? []),
      ]) {
        if (!labelChange.message?.id) {
          continue;
        }
        const local = await this.inboundRepository.findOne({
          where: {
            gmailSyncAccountId: account.id,
            gmailMessageId: labelChange.message.id,
          },
        });
        if (!local) {
          continue;
        }
        const labels = new Set(labelChange.labelIds ?? []);
        if (labels.has("TRASH")) {
          local.mailboxFolder = "trash";
          await this.inboundRepository.save(local);
          updated += 1;
        }
      }
      for (const added of record.messagesAdded ?? []) {
        if (!added.message?.id) {
          continue;
        }
        const full = await this.gmailGet(
          accessToken,
          `${GMAIL_BASE}/messages/${added.message.id}?format=full`,
        );
        const result = await this.upsertGmailMessage(
          account,
          full as GmailMessage,
          "inbox",
        );
        if (result === "imported") {
          imported += 1;
        } else if (result === "updated") {
          updated += 1;
        }
      }
    }
    return { imported, updated };
  }

  public async sendRawMessage(
    organizationId: string,
    accountId: string,
    rawMime: string,
    threadId?: string | null,
  ): Promise<{ providerMessageId: string | null }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId, enabled: true },
    });
    if (!account) {
      throw new NotFoundException("Gmail bağlantısı bulunamadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    const body: Record<string, string> = {
      raw: Buffer.from(rawMime).toString("base64url"),
    };
    if (threadId) {
      body.threadId = threadId;
    }
    const result = await this.gmailPost(
      accessToken,
      `${GMAIL_BASE}/messages/send`,
      body,
    );
    return {
      providerMessageId:
        typeof result.id === "string" ? result.id : null,
    };
  }

  private async upsertGmailMessage(
    account: MailGmailSyncAccountEntity,
    message: GmailMessage,
    folderKey: string,
  ): Promise<"imported" | "updated" | "skipped"> {
    if (!message.id || !account.mailboxId) {
      return "skipped";
    }
    const folderState = this.mapGmailFolder(folderKey);
    const headers = message.payload?.headers ?? [];
    const fromAddress =
      headerValue(headers, "From")?.match(/<([^>]+)>/)?.[1] ??
      headerValue(headers, "From") ??
      "unknown@gmail.com";
    const subject =
      headerValue(headers, "Subject")?.trim() || "(Konu yok)";
    const internetMessageId = headerValue(headers, "Message-ID")?.replace(
      /^<|>$/g,
      "",
    );
    const { bodyText, bodyHtml } = extractBodies(message.payload);
    const snippet = message.snippet?.slice(0, 500) ?? null;
    const receivedAt = message.internalDate
      ? new Date(Number.parseInt(message.internalDate, 10))
      : new Date();
    const readAt = message.labelIds?.includes("UNREAD") ? null : new Date();
    const attachments = extractAttachmentMeta(message.payload);
    const existing = await this.inboundRepository.findOne({
      where: {
        gmailSyncAccountId: account.id,
        gmailMessageId: message.id,
      },
    });
    if (existing) {
      existing.subject = subject;
      existing.snippet = snippet;
      existing.bodyText = bodyText;
      existing.bodyHtml = bodyHtml;
      existing.readAt = readAt;
      existing.mailboxFolder = folderState.mailboxFolder;
      existing.spamStatus = folderState.spamStatus;
      existing.exchangeWellKnownFolder = folderKey;
      existing.gmailThreadId = message.threadId ?? existing.gmailThreadId;
      existing.internetMessageId =
        internetMessageId ?? existing.internetMessageId;
      if (attachments.length > 0) {
        existing.attachments = attachments;
      }
      await this.inboundRepository.save(existing);
      return "updated";
    }
    await this.inboundRepository.save(
      this.inboundRepository.create({
        mailboxId: account.mailboxId,
        fromAddress,
        subject,
        snippet,
        bodyText,
        bodyHtml,
        spamStatus: folderState.spamStatus,
        mailboxFolder: folderState.mailboxFolder,
        internetMessageId: internetMessageId ?? null,
        readAt,
        attachments: attachments.length > 0 ? attachments : null,
        gmailSyncAccountId: account.id,
        gmailMessageId: message.id,
        gmailThreadId: message.threadId ?? null,
        exchangeWellKnownFolder: folderKey,
        receivedAt,
      }),
    );
    return "imported";
  }

  private mapGmailFolder(folderKey: string): {
    mailboxFolder: "inbox" | "archive" | "trash";
    spamStatus: "clean" | "blocked";
  } {
    switch (folderKey) {
      case "junkemail":
        return { mailboxFolder: "inbox", spamStatus: "blocked" };
      case "deleteditems":
        return { mailboxFolder: "trash", spamStatus: "clean" };
      case "sentitems":
        return { mailboxFolder: "archive", spamStatus: "clean" };
      default:
        return { mailboxFolder: "inbox", spamStatus: "clean" };
    }
  }

  private async registerGmailWatch(
    account: MailGmailSyncAccountEntity,
    accessToken: string,
  ): Promise<void> {
    const topic = this.configService.get<string>("GOOGLE_GMAIL_PUBSUB_TOPIC")?.trim();
    if (!topic) {
      return;
    }
    const result = await this.gmailPost(accessToken, `${GMAIL_BASE}/watch`, {
      topicName: topic,
      labelIds: ["INBOX"],
    });
    if (typeof result.expiration === "string") {
      account.gmailWatchExpiration = new Date(Number.parseInt(result.expiration, 10));
      account.gmailWatchTopic = topic;
      await this.accountRepository.save(account);
    }
  }

  private parseOAuthState(
    state: string,
    actor: AuthenticatedUserContext,
  ): { companyId: string; userId: string; ts: number } {
    try {
      const parsed = JSON.parse(
        decryptCalendarCredential(state, this.configService),
      ) as { companyId: string; userId: string; ts: number };
      if (
        parsed.companyId !== actor.companyId ||
        parsed.userId !== actor.userId ||
        Date.now() - parsed.ts > 15 * 60 * 1000
      ) {
        throw new Error("invalid");
      }
      return parsed;
    } catch {
      throw new BadRequestException("Geçersiz OAuth state.");
    }
  }

  private async resolveAccessToken(
    account: MailGmailSyncAccountEntity,
  ): Promise<string> {
    const expires = account.accessTokenExpiresAt?.getTime() ?? 0;
    if (account.accessTokenCiphertext && expires > Date.now() + 60_000) {
      return decryptCalendarCredential(
        account.accessTokenCiphertext,
        this.configService,
      );
    }
    if (!account.refreshTokenCiphertext) {
      throw new BadRequestException("Gmail yenileme tokenı yok; yeniden bağlanın.");
    }
    const refreshToken = decryptCalendarCredential(
      account.refreshTokenCiphertext,
      this.configService,
    );
    const tokens = await this.refreshAccessToken(refreshToken);
    account.accessTokenCiphertext = encryptCalendarCredential(
      tokens.accessToken,
      this.configService,
    );
    if (tokens.refreshToken) {
      account.refreshTokenCiphertext = encryptCalendarCredential(
        tokens.refreshToken,
        this.configService,
      );
    }
    account.accessTokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await this.accountRepository.save(account);
    return tokens.accessToken;
  }

  private async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      code,
      redirect_uri: this.redirectUri(),
      grant_type: "authorization_code",
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException(
        typeof payload.error_description === "string"
          ? payload.error_description
          : "Google token alınamadı.",
      );
    }
    return {
      accessToken: String(payload.access_token),
      refreshToken: String(payload.refresh_token ?? ""),
      expiresIn: Number(payload.expires_in ?? 3600),
    };
  }

  private async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException("Google token yenilenemedi.");
    }
    return {
      accessToken: String(payload.access_token),
      refreshToken:
        typeof payload.refresh_token === "string"
          ? payload.refresh_token
          : undefined,
      expiresIn: Number(payload.expires_in ?? 3600),
    };
  }

  private async fetchGoogleEmail(accessToken: string): Promise<{
    email: string;
    sub?: string;
    name?: string;
  }> {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new BadRequestException("Google profil okunamadı.");
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const email = String(payload.email ?? "");
    if (!email.includes("@")) {
      throw new BadRequestException("Google hesabından e-posta alınamadı.");
    }
    return {
      email,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  }

  private async gmailGet(
    accessToken: string,
    url: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Gmail isteği başarısız (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  private async gmailPut(
    accessToken: string,
    url: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Gmail PUT başarısız (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  private async gmailPost(
    accessToken: string,
    url: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Gmail POST başarısız (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  private clientId(): string {
    return (
      this.configService.get<string>("GOOGLE_GMAIL_CLIENT_ID")?.trim() ??
      this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_ID")?.trim() ??
      ""
    );
  }

  private clientSecret(): string {
    return (
      this.configService.get<string>("GOOGLE_GMAIL_CLIENT_SECRET")?.trim() ??
      this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() ??
      ""
    );
  }

  private redirectUri(): string {
    const explicit = this.configService
      .get<string>("GOOGLE_GMAIL_REDIRECT_URI")
      ?.trim();
    if (explicit) {
      return explicit;
    }
    const publicUrl =
      this.configService.get<string>("LERTA_MAIL_PUBLIC_URL")?.trim() ??
      "https://posta.lerta.com.tr";
    return `${publicUrl.replace(/\/$/, "")}/mail/gmail-oauth`;
  }

  private toDto(row: MailGmailSyncAccountEntity): MailGmailSyncAccountDto {
    return {
      id: row.id,
      emailAddress: row.emailAddress,
      displayName: row.displayName,
      enabled: row.enabled,
      mailboxId: row.mailboxId,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};
type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: { headers?: GmailHeader[]; parts?: GmailPart[]; body?: { data?: string } };
};

function resolveGmailFolderKeyFromLabels(labelIds: string[]): string {
  if (labelIds.includes("DRAFT")) {
    return "drafts";
  }
  if (labelIds.includes("SENT")) {
    return "sentitems";
  }
  if (labelIds.includes("TRASH")) {
    return "deleteditems";
  }
  if (labelIds.includes("SPAM")) {
    return "junkemail";
  }
  if (!labelIds.includes("INBOX")) {
    return "archive";
  }
  return "inbox";
}

function headerValue(headers: GmailHeader[], name: string): string | null {
  const row = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return row?.value ?? null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function extractBodies(payload?: GmailMessage["payload"]): {
  bodyText: string | null;
  bodyHtml: string | null;
} {
  let bodyText: string | null = null;
  let bodyHtml: string | null = null;
  const walk = (part: GmailPart) => {
    if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText = decodeBase64Url(part.body.data).slice(0, 200_000);
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml = decodeBase64Url(part.body.data).slice(0, 400_000);
    }
    for (const child of part.parts ?? []) {
      walk(child);
    }
  };
  if (payload?.body?.data && !payload.parts?.length) {
    bodyText = decodeBase64Url(payload.body.data).slice(0, 200_000);
  }
  for (const part of payload?.parts ?? []) {
    walk(part);
  }
  return { bodyText, bodyHtml };
}

function extractAttachmentMeta(
  payload?: GmailMessage["payload"],
): MailInboundAttachmentMeta[] {
  const files: MailInboundAttachmentMeta[] = [];
  const walk = (part: GmailPart) => {
    if (part.filename && part.body?.attachmentId) {
      files.push({
        filename: part.filename,
        contentType: part.mimeType ?? "application/octet-stream",
        sizeBytes: part.body.size ?? 0,
        storagePath: null,
        gmailAttachmentId: part.body.attachmentId,
      });
    }
    for (const child of part.parts ?? []) {
      walk(child);
    }
  };
  for (const part of payload?.parts ?? []) {
    walk(part);
  }
  return files;
}
