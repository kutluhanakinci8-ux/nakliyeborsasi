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
import { MailExchangeSyncAccountEntity } from "../../infrastructure/database/entities/MailExchangeSyncAccountEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

const GRAPH_SCOPE =
  "offline_access User.Read Mail.ReadWrite Mail.Send openid profile email";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type MailExchangeSyncAccountDto = {
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
export class MailExchangeGraphSyncService {
  private readonly logger = new Logger(MailExchangeGraphSyncService.name);

  public constructor(
    @InjectRepository(MailExchangeSyncAccountEntity)
    private readonly accountRepository: Repository<MailExchangeSyncAccountEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    private readonly configService: ConfigService,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_ID")?.trim() &&
        this.configService
          .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_SECRET")
          ?.trim() &&
        this.configService
          .get<string>("MICROSOFT_GRAPH_MAIL_REDIRECT_URI")
          ?.trim(),
    );
  }

  public buildOAuthStart(actor: AuthenticatedUserContext): {
    authorizationUrl: string;
    state: string;
  } {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Exchange senkronu için MICROSOFT_GRAPH_MAIL_* ortam değişkenleri tanımlanmalıdır.",
      );
    }
    const clientId = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_ID")!
      .trim();
    const redirectUri = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_REDIRECT_URI")!
      .trim();
    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({
      companyId: actor.companyId,
      userId: actor.userId,
      nonce,
      ts: Date.now(),
    });
    const state = encryptCalendarCredential(statePayload, this.configService);
    const url = new URL(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    );
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", GRAPH_SCOPE);
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return { authorizationUrl: url.toString(), state };
  }

  public async completeOAuth(
    actor: AuthenticatedUserContext,
    code: string,
    state: string,
  ): Promise<MailExchangeSyncAccountDto> {
    if (!code.trim() || !state.trim()) {
      throw new BadRequestException("OAuth kodu veya state eksik.");
    }
    let parsed: {
      companyId: string;
      userId: string;
      nonce: string;
      ts: number;
    };
    try {
      parsed = JSON.parse(
        decryptCalendarCredential(state, this.configService),
      ) as typeof parsed;
    } catch {
      throw new BadRequestException("Geçersiz OAuth state.");
    }
    if (
      parsed.companyId !== actor.companyId ||
      parsed.userId !== actor.userId ||
      Date.now() - parsed.ts > 15 * 60 * 1000
    ) {
      throw new BadRequestException("OAuth oturumu süresi doldu veya geçersiz.");
    }
    const tokens = await this.exchangeCodeForTokens(code.trim());
    const profile = await this.fetchGraphProfile(tokens.accessToken);
    const email = (
      profile.mail ??
      profile.userPrincipalName ??
      ""
    ).toLowerCase();
    if (!email.includes("@")) {
      throw new BadRequestException("Microsoft hesabından e-posta alınamadı.");
    }
    let account = await this.accountRepository.findOne({
      where: {
        organizationId: actor.companyId,
        emailAddress: email,
      },
    });
    if (!account) {
      account = this.accountRepository.create({
        organizationId: actor.companyId,
        connectedByUserId: actor.userId,
        emailAddress: email,
      });
    }
    account.microsoftUserId = profile.id ?? null;
    account.displayName = profile.displayName ?? null;
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
          emailAddress: `exchange+${email}`,
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
      actionCode: MailIdentityAuditAction.ExchangeSyncConnected,
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
  ): Promise<MailExchangeSyncAccountDto[]> {
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
      throw new NotFoundException("Exchange bağlantısı bulunamadı.");
    }
    await this.accountRepository.remove(account);
    await this.mailIdentityAuditService.record({
      actorUserId: actor.userId,
      actorCompanyId: actor.companyId,
      actionCode: MailIdentityAuditAction.ExchangeSyncDisconnected,
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
    if (!account || !account.enabled) {
      throw new NotFoundException("Exchange bağlantısı bulunamadı.");
    }
    if (!account.mailboxId) {
      throw new BadRequestException("Exchange posta kutusu henüz oluşturulmadı.");
    }
    const accessToken = await this.resolveAccessToken(account);
    let imported = 0;
    let updated = 0;
    try {
      const deltaUrl =
        account.deltaLink ??
        `${GRAPH_BASE}/me/mailFolders/inbox/messages/delta?$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,internetMessageId&$top=50`;
      const page = await this.graphGet(accessToken, deltaUrl);
      const messages = (page.value ?? []) as GraphMessage[];
      for (const message of messages) {
        if (!message.id) {
          continue;
        }
        const existing = await this.inboundRepository.findOne({
          where: {
            exchangeSyncAccountId: account.id,
            exchangeMessageId: message.id,
          },
        });
        const fromAddress =
          message.from?.emailAddress?.address ?? "unknown@exchange";
        const subject = message.subject?.trim() || "(Konu yok)";
        const snippet = message.bodyPreview?.slice(0, 500) ?? null;
        const bodyText =
          message.body?.contentType === "text"
            ? message.body.content?.slice(0, 200_000) ?? null
            : null;
        const bodyHtml =
          message.body?.contentType === "html"
            ? message.body.content?.slice(0, 400_000) ?? null
            : null;
        const receivedAt = message.receivedDateTime
          ? new Date(message.receivedDateTime)
          : new Date();
        if (existing) {
          existing.subject = subject;
          existing.snippet = snippet;
          existing.bodyText = bodyText;
          existing.bodyHtml = bodyHtml;
          existing.readAt = message.isRead ? existing.readAt ?? new Date() : null;
          await this.inboundRepository.save(existing);
          updated += 1;
        } else {
          await this.inboundRepository.save(
            this.inboundRepository.create({
              mailboxId: account.mailboxId,
              fromAddress,
              subject,
              snippet,
              bodyText,
              bodyHtml,
              spamStatus: "clean",
              internetMessageId: message.internetMessageId ?? null,
              readAt: message.isRead ? new Date() : null,
              exchangeSyncAccountId: account.id,
              exchangeMessageId: message.id,
              receivedAt,
            }),
          );
          imported += 1;
        }
      }
      const nextLink = page["@odata.deltaLink"] ?? page["@odata.nextLink"];
      if (typeof nextLink === "string" && nextLink.includes("/delta")) {
        account.deltaLink = nextLink;
      } else if (typeof nextLink === "string") {
        account.deltaLink = null;
      }
      account.lastSyncedAt = new Date();
      account.lastSyncError = null;
      await this.accountRepository.save(account);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Exchange senkron hatası";
      account.lastSyncError = message.slice(0, 500);
      await this.accountRepository.save(account);
      this.logger.warn(`Exchange sync failed for ${account.id}: ${message}`);
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
        /* continue other accounts */
      }
    }
    return { accounts: accounts.length, imported, updated };
  }

  private async resolveAccessToken(
    account: MailExchangeSyncAccountEntity,
  ): Promise<string> {
    const expires = account.accessTokenExpiresAt?.getTime() ?? 0;
    if (
      account.accessTokenCiphertext &&
      expires > Date.now() + 60_000
    ) {
      return decryptCalendarCredential(
        account.accessTokenCiphertext,
        this.configService,
      );
    }
    if (!account.refreshTokenCiphertext) {
      throw new BadRequestException("Exchange yenileme tokenı yok; yeniden bağlanın.");
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
    const clientId = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_ID")!
      .trim();
    const clientSecret = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_SECRET")!
      .trim();
    const redirectUri = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_REDIRECT_URI")!
      .trim();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException(
        typeof payload.error_description === "string"
          ? payload.error_description
          : "Microsoft token alınamadı.",
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
    const clientId = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_ID")!
      .trim();
    const clientSecret = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_SECRET")!
      .trim();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException(
        typeof payload.error_description === "string"
          ? payload.error_description
          : "Microsoft token yenilenemedi.",
      );
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

  private async fetchGraphProfile(accessToken: string): Promise<GraphProfile> {
    const response = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new BadRequestException("Microsoft profil okunamadı.");
    }
    return (await response.json()) as GraphProfile;
  }

  private async graphGet(
    accessToken: string,
    url: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Graph isteği başarısız (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  private toDto(row: MailExchangeSyncAccountEntity): MailExchangeSyncAccountDto {
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

type GraphProfile = {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

type GraphMessage = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { address?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  internetMessageId?: string;
};
