import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { IsNull, Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MailCalendarGraphAccountEntity } from "../../infrastructure/database/entities/MailCalendarGraphAccountEntity";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";

const GRAPH_SCOPE =
  "offline_access User.Read Calendars.ReadWrite openid profile email";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const SYNC_PAST_MS = 90 * 24 * 60 * 60 * 1000;
const SYNC_FUTURE_MS = 730 * 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS = 3;

export type MailCalendarGraphAccountDto = {
  id: string;
  emailAddress: string;
  displayName: string | null;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
};

type GraphEvent = {
  id: string;
  subject?: string;
  body?: { content?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  isAllDay?: boolean;
  location?: { displayName?: string };
  changeKey?: string;
  "@removed"?: { reason?: string };
};

@Injectable()
export class MailCalendarGraphSyncService {
  private readonly logger = new Logger(MailCalendarGraphSyncService.name);

  public constructor(
    @InjectRepository(MailCalendarGraphAccountEntity)
    private readonly accountRepository: Repository<MailCalendarGraphAccountEntity>,
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
    private readonly configService: ConfigService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.clientId() && this.clientSecret() && this.redirectUri());
  }

  public async listAccounts(
    organizationId: string,
  ): Promise<MailCalendarGraphAccountDto[]> {
    const rows = await this.accountRepository.find({
      where: { organizationId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public buildOAuthStart(actor: AuthenticatedUserContext): {
    authorizationUrl: string;
    state: string;
  } {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Graph takvim için MICROSOFT_GRAPH_MAIL_* veya MICROSOFT_GRAPH_CALENDAR_* tanımlayın.",
      );
    }
    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({
      companyId: actor.companyId,
      userId: actor.userId,
      nonce,
      ts: Date.now(),
      kind: "calendar",
    });
    const state = encryptCalendarCredential(statePayload, this.configService);
    const url = new URL(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    );
    url.searchParams.set("client_id", this.clientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri());
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
  ): Promise<MailCalendarGraphAccountDto> {
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
      throw new BadRequestException("OAuth state geçersiz.");
    }
    if (parsed.companyId !== actor.companyId || parsed.userId !== actor.userId) {
      throw new BadRequestException("OAuth state oturumla uyuşmuyor.");
    }
    if (Date.now() - parsed.ts > 15 * 60 * 1000) {
      throw new BadRequestException("OAuth state süresi doldu.");
    }
    const count = await this.accountRepository.count({
      where: { organizationId: actor.companyId },
    });
    if (count >= MAX_ACCOUNTS) {
      throw new BadRequestException(`En fazla ${MAX_ACCOUNTS} Graph takvim hesabı.`);
    }
    const tokens = await this.exchangeCodeForTokens(code.trim());
    const profile = await this.fetchGraphProfile(tokens.accessToken);
    const email =
      profile.mail?.trim() ||
      profile.userPrincipalName?.trim() ||
      "outlook@connected";
    let account = await this.accountRepository.findOne({
      where: {
        organizationId: actor.companyId,
        emailAddress: email.toLowerCase(),
      },
    });
    if (!account) {
      account = this.accountRepository.create({
        organizationId: actor.companyId,
        connectedByUserId: actor.userId,
        emailAddress: email.toLowerCase(),
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
    account.accessTokenExpiresAt = new Date(
      Date.now() + tokens.expiresIn * 1000,
    );
    account.enabled = true;
    account.writeEnabled = true;
    account.lastSyncError = null;
    account = await this.accountRepository.save(account);
    try {
      await this.syncAccount(actor.companyId, account.id, actor.userId);
    } catch (error) {
      this.logger.warn(
        `Initial Graph calendar sync failed: ${error instanceof Error ? error.message : error}`,
      );
    }
    return this.toDto(account);
  }

  public async deleteAccount(
    actor: AuthenticatedUserContext,
    accountId: string,
  ): Promise<void> {
    const account = await this.assertAccount(actor.companyId, accountId);
    await this.accountRepository.remove(account);
  }

  public async syncAccount(
    organizationId: string,
    accountId: string,
    actorUserId: string | null,
  ): Promise<{ imported: number; updated: number; pushed: number }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.enabled) {
      throw new BadRequestException("Graph hesabı devre dışı.");
    }
    let imported = 0;
    let updated = 0;
    let pushed = 0;
    try {
      const accessToken = await this.resolveAccessToken(account);
      const pull = await this.pullFromGraph(account, accessToken, organizationId);
      imported = pull.imported;
      updated = pull.updated;
      if (account.writeEnabled) {
        pushed = await this.pushLocalToGraph(
          account,
          accessToken,
          organizationId,
        );
      }
      account.lastSyncedAt = new Date();
      account.lastSyncError = null;
      await this.accountRepository.save(account);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Graph takvim senkron hatası";
      account.lastSyncError = message.slice(0, 500);
      await this.accountRepository.save(account);
      throw error;
    }
    void actorUserId;
    return { imported, updated, pushed };
  }

  public async syncAllForOrganization(
    organizationId: string,
    actorUserId: string,
  ): Promise<{
    accounts: number;
    imported: number;
    updated: number;
    pushed: number;
  }> {
    const accounts = await this.accountRepository.find({
      where: { organizationId, enabled: true },
    });
    let imported = 0;
    let updated = 0;
    let pushed = 0;
    for (const account of accounts) {
      try {
        const result = await this.syncAccount(
          organizationId,
          account.id,
          actorUserId,
        );
        imported += result.imported;
        updated += result.updated;
        pushed += result.pushed;
      } catch {
        /* continue */
      }
    }
    return { accounts: accounts.length, imported, updated, pushed };
  }

  private async pullFromGraph(
    account: MailCalendarGraphAccountEntity,
    accessToken: string,
    organizationId: string,
  ): Promise<{ imported: number; updated: number }> {
    const start = new Date(Date.now() - SYNC_PAST_MS).toISOString();
    const end = new Date(Date.now() + SYNC_FUTURE_MS).toISOString();
    let imported = 0;
    let updated = 0;
    let url: string | null =
      account.deltaLink ??
      `${GRAPH_BASE}/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=200`;
    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        value?: GraphEvent[];
        "@odata.nextLink"?: string;
        "@odata.deltaLink"?: string;
      };
      if (!response.ok) {
        throw new BadRequestException("Graph takvim okunamadı.");
      }
      for (const item of payload.value ?? []) {
        if (item["@removed"]) {
          if (item.id) {
            await this.eventRepository.delete({
              organizationId,
              graphAccountId: account.id,
              graphEventId: item.id,
            });
          }
          continue;
        }
        const mapped = this.mapGraphEvent(item);
        if (!mapped) {
          continue;
        }
        const existing = await this.eventRepository.findOne({
          where: {
            organizationId,
            graphAccountId: account.id,
            graphEventId: item.id,
          },
        });
        if (existing) {
          Object.assign(existing, mapped);
          existing.graphChangeKey = item.changeKey ?? null;
          await this.eventRepository.save(existing);
          updated += 1;
        } else {
          await this.eventRepository.save(
            this.eventRepository.create({
              organizationId,
              graphAccountId: account.id,
              graphEventId: item.id,
              graphChangeKey: item.changeKey ?? null,
              ...mapped,
            }),
          );
          imported += 1;
        }
      }
      if (payload["@odata.deltaLink"]) {
        account.deltaLink = payload["@odata.deltaLink"];
        url = null;
      } else {
        url = payload["@odata.nextLink"] ?? null;
      }
    }
    await this.accountRepository.save(account);
    return { imported, updated };
  }

  private async pushLocalToGraph(
    account: MailCalendarGraphAccountEntity,
    accessToken: string,
    organizationId: string,
  ): Promise<number> {
    const locals = await this.eventRepository.find({
      where: {
        organizationId,
        graphEventId: IsNull(),
      },
      order: { updatedAt: "DESC" },
      take: 40,
    });
    let pushed = 0;
    for (const row of locals) {
      if (row.graphAccountId && row.graphAccountId !== account.id) {
        continue;
      }
      const body = {
        subject: row.title,
        body: {
          contentType: "text",
          content: row.description ?? "",
        },
        start: this.toGraphDateTime(row.startsAt, row.allDay),
        end: this.toGraphDateTime(row.endsAt, row.allDay),
        isAllDay: row.allDay,
        location: row.location
          ? { displayName: row.location }
          : undefined,
      };
      const response = await fetch(`${GRAPH_BASE}/me/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const created = (await response.json()) as GraphEvent;
      if (!response.ok || !created.id) {
        continue;
      }
      row.graphAccountId = account.id;
      row.graphEventId = created.id;
      row.graphChangeKey = created.changeKey ?? null;
      await this.eventRepository.save(row);
      pushed += 1;
    }
    return pushed;
  }

  private mapGraphEvent(
    item: GraphEvent,
  ): Omit<
    MailCalendarEventEntity,
    | "id"
    | "organizationId"
    | "createdAt"
    | "updatedAt"
    | "graphAccountId"
    | "graphEventId"
    | "graphChangeKey"
    | "googleAccountId"
    | "googleEventId"
    | "googleEtag"
    | "icsFeedId"
    | "caldavAccountId"
    | "caldavResourceHref"
    | "caldavEtag"
    | "externalUid"
    | "createdByUserId"
  > | null {
    const startsAt = this.parseGraphInstant(item.start, item.isAllDay);
    const endsAt = this.parseGraphInstant(item.end, item.isAllDay);
    if (!startsAt || !endsAt) {
      return null;
    }
    return {
      title: item.subject?.trim() || "(Etkinlik)",
      description: item.body?.content?.trim() || null,
      location: item.location?.displayName?.trim() || null,
      startsAt,
      endsAt,
      allDay: Boolean(item.isAllDay),
      recurrenceRule: null,
      recurrenceUntil: null,
    };
  }

  private parseGraphInstant(
    slot: GraphEvent["start"],
    allDay?: boolean,
  ): Date | null {
    if (!slot) {
      return null;
    }
    const raw = allDay ? slot.date : slot.dateTime;
    if (!raw) {
      return null;
    }
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  private toGraphDateTime(date: Date, allDay: boolean): {
    dateTime?: string;
    date?: string;
    timeZone: string;
  } {
    const tz = "UTC";
    if (allDay) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return { date: `${y}-${m}-${d}`, timeZone: tz };
    }
    return { dateTime: date.toISOString(), timeZone: tz };
  }

  private async assertAccount(
    organizationId: string,
    accountId: string,
  ): Promise<MailCalendarGraphAccountEntity> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException("Graph takvim hesabı bulunamadı.");
    }
    return account;
  }

  private toDto(row: MailCalendarGraphAccountEntity): MailCalendarGraphAccountDto {
    return {
      id: row.id,
      emailAddress: row.emailAddress,
      displayName: row.displayName,
      enabled: row.enabled,
      writeEnabled: row.writeEnabled,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private clientId(): string {
    return (
      this.configService.get<string>("MICROSOFT_GRAPH_CALENDAR_CLIENT_ID")?.trim() ||
      this.configService.get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_ID")?.trim() ||
      ""
    );
  }

  private clientSecret(): string {
    return (
      this.configService
        .get<string>("MICROSOFT_GRAPH_CALENDAR_CLIENT_SECRET")
        ?.trim() ||
      this.configService
        .get<string>("MICROSOFT_GRAPH_MAIL_CLIENT_SECRET")
        ?.trim() ||
      ""
    );
  }

  private redirectUri(): string {
    const explicit = this.configService
      .get<string>("MICROSOFT_GRAPH_CALENDAR_REDIRECT_URI")
      ?.trim();
    if (explicit) {
      return explicit;
    }
    const mailUri = this.configService
      .get<string>("MICROSOFT_GRAPH_MAIL_REDIRECT_URI")
      ?.trim();
    if (mailUri) {
      return mailUri.replace(/exchange-oauth\/?$/, "calendar-oauth");
    }
    const publicUrl =
      this.configService.get<string>("MAIL_WEB_PUBLIC_URL")?.trim() ||
      "https://posta.lerta.com.tr";
    return `${publicUrl.replace(/\/$/, "")}/mail/calendar-oauth`;
  }

  private async resolveAccessToken(
    account: MailCalendarGraphAccountEntity,
  ): Promise<string> {
    const expires = account.accessTokenExpiresAt?.getTime() ?? 0;
    if (account.accessTokenCiphertext && expires > Date.now() + 60_000) {
      return decryptCalendarCredential(
        account.accessTokenCiphertext,
        this.configService,
      );
    }
    if (!account.refreshTokenCiphertext) {
      throw new BadRequestException("Graph yenileme tokenı yok; yeniden bağlanın.");
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
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
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
    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException("Graph access token yenilenemedi.");
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

  private async fetchGraphProfile(accessToken: string): Promise<{
    id?: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  }> {
    const response = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return (await response.json()) as {
      id?: string;
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
    };
  }
}
