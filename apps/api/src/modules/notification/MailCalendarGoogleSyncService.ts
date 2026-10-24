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
import { MailCalendarGoogleAccountEntity } from "../../infrastructure/database/entities/MailCalendarGoogleAccountEntity";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary";
const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email openid";
const SYNC_PAST_MS = 90 * 24 * 60 * 60 * 1000;
const SYNC_FUTURE_MS = 730 * 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS = 3;

export type MailCalendarGoogleAccountDto = {
  id: string;
  emailAddress: string;
  displayName: string | null;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  etag?: string;
};

@Injectable()
export class MailCalendarGoogleSyncService {
  private readonly logger = new Logger(MailCalendarGoogleSyncService.name);

  public constructor(
    @InjectRepository(MailCalendarGoogleAccountEntity)
    private readonly accountRepository: Repository<MailCalendarGoogleAccountEntity>,
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
    private readonly configService: ConfigService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.clientId() && this.clientSecret() && this.redirectUri());
  }

  public async listAccounts(
    organizationId: string,
  ): Promise<MailCalendarGoogleAccountDto[]> {
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
        "Google takvim için GOOGLE_CALENDAR_CLIENT_ID ve GOOGLE_CALENDAR_CLIENT_SECRET tanımlayın.",
      );
    }
    const nonce = randomBytes(16).toString("hex");
    const statePayload = JSON.stringify({
      companyId: actor.companyId,
      userId: actor.userId,
      nonce,
      ts: Date.now(),
      kind: "google_calendar",
    });
    const state = encryptCalendarCredential(statePayload, this.configService);
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", this.clientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri());
    url.searchParams.set("scope", GOOGLE_SCOPE);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return { authorizationUrl: url.toString(), state };
  }

  public async completeOAuth(
    actor: AuthenticatedUserContext,
    code: string,
    state: string,
  ): Promise<MailCalendarGoogleAccountDto> {
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
      throw new BadRequestException(`En fazla ${MAX_ACCOUNTS} Google takvim hesabı.`);
    }
    const tokens = await this.exchangeCodeForTokens(code.trim());
    const profile = await this.fetchGoogleProfile(tokens.accessToken);
    const email = profile.email?.trim() || "google@connected";
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
        `Initial Google calendar sync failed: ${error instanceof Error ? error.message : error}`,
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
      throw new BadRequestException("Google hesabı devre dışı.");
    }
    let imported = 0;
    let updated = 0;
    let pushed = 0;
    try {
      const accessToken = await this.resolveAccessToken(account);
      const pull = await this.pullFromGoogle(account, accessToken, organizationId);
      imported = pull.imported;
      updated = pull.updated;
      if (account.writeEnabled) {
        pushed = await this.pushLocalToGoogle(
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
        error instanceof Error ? error.message : "Google takvim senkron hatası";
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

  private async pullFromGoogle(
    account: MailCalendarGoogleAccountEntity,
    accessToken: string,
    organizationId: string,
  ): Promise<{ imported: number; updated: number }> {
    const timeMin = new Date(Date.now() - SYNC_PAST_MS).toISOString();
    const timeMax = new Date(Date.now() + SYNC_FUTURE_MS).toISOString();
    let imported = 0;
    let updated = 0;
    let pageToken: string | undefined;
    do {
      const url = new URL(`${GOOGLE_CALENDAR_BASE}/events`);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");
      if (account.syncToken) {
        url.searchParams.set("syncToken", account.syncToken);
      } else {
        url.searchParams.set("timeMin", timeMin);
        url.searchParams.set("timeMax", timeMax);
      }
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        items?: GoogleEvent[];
        nextPageToken?: string;
        nextSyncToken?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        if (payload.error?.message?.includes("Sync token")) {
          account.syncToken = null;
          await this.accountRepository.save(account);
          return this.pullFromGoogle(account, accessToken, organizationId);
        }
        throw new BadRequestException(
          payload.error?.message ?? "Google takvim okunamadı.",
        );
      }
      for (const item of payload.items ?? []) {
        if (item.status === "cancelled" && item.id) {
          await this.eventRepository.delete({
            organizationId,
            googleAccountId: account.id,
            googleEventId: item.id,
          });
          continue;
        }
        const mapped = this.mapGoogleEvent(item);
        if (!mapped || !item.id) {
          continue;
        }
        const existing = await this.eventRepository.findOne({
          where: {
            organizationId,
            googleAccountId: account.id,
            googleEventId: item.id,
          },
        });
        if (existing) {
          Object.assign(existing, mapped);
          existing.googleEtag = item.etag ?? null;
          await this.eventRepository.save(existing);
          updated += 1;
        } else {
          await this.eventRepository.save(
            this.eventRepository.create({
              organizationId,
              googleAccountId: account.id,
              googleEventId: item.id,
              googleEtag: item.etag ?? null,
              ...mapped,
            }),
          );
          imported += 1;
        }
      }
      if (payload.nextSyncToken) {
        account.syncToken = payload.nextSyncToken;
        await this.accountRepository.save(account);
      }
      pageToken = payload.nextPageToken;
    } while (pageToken);
    return { imported, updated };
  }

  private async pushLocalToGoogle(
    account: MailCalendarGoogleAccountEntity,
    accessToken: string,
    organizationId: string,
  ): Promise<number> {
    const locals = await this.eventRepository.find({
      where: {
        organizationId,
        googleEventId: IsNull(),
      },
      order: { updatedAt: "DESC" },
      take: 40,
    });
    let pushed = 0;
    for (const row of locals) {
      if (row.googleAccountId && row.googleAccountId !== account.id) {
        continue;
      }
      const body = {
        summary: row.title,
        description: row.description ?? undefined,
        location: row.location ?? undefined,
        start: this.toGoogleDateTime(row.startsAt, row.allDay),
        end: this.toGoogleDateTime(row.endsAt, row.allDay),
      };
      const response = await fetch(`${GOOGLE_CALENDAR_BASE}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const created = (await response.json()) as GoogleEvent;
      if (!response.ok || !created.id) {
        continue;
      }
      row.googleAccountId = account.id;
      row.googleEventId = created.id;
      row.googleEtag = created.etag ?? null;
      await this.eventRepository.save(row);
      pushed += 1;
    }
    return pushed;
  }

  private mapGoogleEvent(item: GoogleEvent): {
    title: string;
    description: string | null;
    location: string | null;
    startsAt: Date;
    endsAt: Date;
    allDay: boolean;
    recurrenceRule: string | null;
    recurrenceUntil: Date | null;
  } | null {
    const allDay = Boolean(item.start?.date && !item.start?.dateTime);
    const startsAt = this.parseGoogleInstant(item.start, allDay);
    const endsAt = this.parseGoogleInstant(item.end, allDay);
    if (!startsAt || !endsAt) {
      return null;
    }
    return {
      title: item.summary?.trim() || "(Etkinlik)",
      description: item.description?.trim() || null,
      location: item.location?.trim() || null,
      startsAt,
      endsAt,
      allDay,
      recurrenceRule: null,
      recurrenceUntil: null,
    };
  }

  private parseGoogleInstant(
    slot: GoogleEvent["start"],
    allDay: boolean,
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

  private toGoogleDateTime(
    date: Date,
    allDay: boolean,
  ): { dateTime?: string; date?: string; timeZone?: string } {
    if (allDay) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return { date: `${y}-${m}-${d}` };
    }
    return { dateTime: date.toISOString(), timeZone: "UTC" };
  }

  private async assertAccount(
    organizationId: string,
    accountId: string,
  ): Promise<MailCalendarGoogleAccountEntity> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, organizationId },
    });
    if (!account) {
      throw new NotFoundException("Google takvim hesabı bulunamadı.");
    }
    return account;
  }

  private toDto(row: MailCalendarGoogleAccountEntity): MailCalendarGoogleAccountDto {
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
    return this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_ID")?.trim() || "";
  }

  private clientSecret(): string {
    return (
      this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() || ""
    );
  }

  private redirectUri(): string {
    const explicit = this.configService
      .get<string>("GOOGLE_CALENDAR_REDIRECT_URI")
      ?.trim();
    if (explicit) {
      return explicit;
    }
    const publicUrl =
      this.configService.get<string>("MAIL_WEB_PUBLIC_URL")?.trim() ||
      "https://posta.lerta.com.tr";
    return `${publicUrl.replace(/\/$/, "")}/mail/google-calendar-oauth`;
  }

  private async resolveAccessToken(
    account: MailCalendarGoogleAccountEntity,
  ): Promise<string> {
    const expires = account.accessTokenExpiresAt?.getTime() ?? 0;
    if (account.accessTokenCiphertext && expires > Date.now() + 60_000) {
      return decryptCalendarCredential(
        account.accessTokenCiphertext,
        this.configService,
      );
    }
    if (!account.refreshTokenCiphertext) {
      throw new BadRequestException("Google yenileme tokenı yok; yeniden bağlanın.");
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
      throw new BadRequestException("Google access token yenilenemedi.");
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

  private async fetchGoogleProfile(accessToken: string): Promise<{
    sub?: string;
    email?: string;
    name?: string;
  }> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };
  }
}
