import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCalendarCalDavAccountEntity } from "../../infrastructure/database/entities/MailCalendarCalDavAccountEntity";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import { MailCalendarRecurrenceExceptionEntity } from "../../infrastructure/database/entities/MailCalendarRecurrenceExceptionEntity";
import {
  decryptCalendarCredential,
  encryptCalendarCredential,
} from "./MailCalendarCalDavCredentialCipher";
import {
  calDavCalendarQuery,
  calDavPropfind,
  calDavDeleteResource,
  calDavPutIcs,
  joinCalDavResourceUrl,
} from "./MailCalDavHttp";
import {
  buildCalDavRecurringSeriesIcal,
  buildSingleVeventIcal,
  type CalDavRecurrenceOverrideVevent,
  parseIcalEvents,
} from "./MailIcalUtil";

const MAX_ACCOUNTS = 3;
const SYNC_PAST_MS = 90 * 24 * 60 * 60 * 1000;
const SYNC_FUTURE_MS = 730 * 24 * 60 * 60 * 1000;

export type MailCalendarCalDavAccountDto = {
  id: string;
  label: string;
  calendarUrl: string;
  username: string;
  enabled: boolean;
  writeEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailCalendarCalDavService {
  public constructor(
    @InjectRepository(MailCalendarCalDavAccountEntity)
    private readonly accountRepository: Repository<MailCalendarCalDavAccountEntity>,
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
    @InjectRepository(MailCalendarRecurrenceExceptionEntity)
    private readonly recurrenceExceptionRepository: Repository<MailCalendarRecurrenceExceptionEntity>,
    private readonly configService: ConfigService,
  ) {}

  public async list(
    organizationId: string,
  ): Promise<MailCalendarCalDavAccountDto[]> {
    const rows = await this.accountRepository.find({
      where: { organizationId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    input: {
      label: string;
      calendarUrl: string;
      username: string;
      password: string;
      enabled?: boolean;
      writeEnabled?: boolean;
    },
  ): Promise<MailCalendarCalDavAccountDto> {
    const count = await this.accountRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_ACCOUNTS) {
      throw new BadRequestException(`En fazla ${MAX_ACCOUNTS} CalDAV hesabı.`);
    }
    const calendarUrl = this.normalizeCalendarUrl(input.calendarUrl);
    const password = input.password.trim();
    if (password.length < 1) {
      throw new BadRequestException("Şifre gerekli.");
    }
    await calDavPropfind(calendarUrl, input.username.trim(), password);
    const row = await this.accountRepository.save(
      this.accountRepository.create({
        organizationId,
        label: input.label.trim(),
        calendarUrl,
        username: input.username.trim(),
        passwordCiphertext: encryptCalendarCredential(
          password,
          this.configService,
        ),
        enabled: input.enabled ?? true,
        writeEnabled: input.writeEnabled ?? true,
        lastSyncedAt: null,
        lastSyncError: null,
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    accountId: string,
    input: {
      label?: string;
      calendarUrl?: string;
      username?: string;
      password?: string;
      enabled?: boolean;
      writeEnabled?: boolean;
    },
  ): Promise<MailCalendarCalDavAccountDto> {
    const row = await this.assertAccount(organizationId, accountId);
    if (input.label !== undefined) {
      row.label = input.label.trim();
    }
    if (input.username !== undefined) {
      row.username = input.username.trim();
    }
    if (input.enabled !== undefined) {
      row.enabled = input.enabled;
    }
    if (input.writeEnabled !== undefined) {
      row.writeEnabled = input.writeEnabled;
    }
    if (input.calendarUrl !== undefined) {
      row.calendarUrl = this.normalizeCalendarUrl(input.calendarUrl);
    }
    if (input.password !== undefined && input.password.trim().length > 0) {
      row.passwordCiphertext = encryptCalendarCredential(
        input.password.trim(),
        this.configService,
      );
    }
    const password = decryptCalendarCredential(
      row.passwordCiphertext,
      this.configService,
    );
    await calDavPropfind(row.calendarUrl, row.username, password);
    await this.accountRepository.save(row);
    return this.toDto(row);
  }

  public async delete(organizationId: string, accountId: string): Promise<void> {
    await this.assertAccount(organizationId, accountId);
    await this.eventRepository.delete({
      organizationId,
      caldavAccountId: accountId,
    });
    await this.accountRepository.delete({ id: accountId, organizationId });
  }

  public async sync(
    organizationId: string,
    accountId: string,
    userId: string | null,
  ): Promise<{ imported: number; updated: number; removed: number }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.enabled) {
      throw new BadRequestException("Bu CalDAV hesabı devre dışı.");
    }
    const outcome = await this.syncAccountRow(account, userId);
    if (!outcome.ok) {
      throw new BadRequestException(outcome.error);
    }
    return {
      imported: outcome.imported,
      updated: outcome.updated,
      removed: outcome.removed,
    };
  }

  public async syncAllForOrganization(
    organizationId: string,
    userId: string | null,
  ): Promise<{
    accounts: number;
    succeeded: number;
    failed: number;
    imported: number;
    updated: number;
    removed: number;
  }> {
    const rows = await this.accountRepository.find({
      where: { organizationId, enabled: true },
      order: { createdAt: "ASC" },
    });
    let succeeded = 0;
    let failed = 0;
    let imported = 0;
    let updated = 0;
    let removed = 0;
    for (const account of rows) {
      const outcome = await this.syncAccountRow(account, userId);
      if (outcome.ok) {
        succeeded += 1;
        imported += outcome.imported;
        updated += outcome.updated;
        removed += outcome.removed;
      } else {
        failed += 1;
      }
    }
    return {
      accounts: rows.length,
      succeeded,
      failed,
      imported,
      updated,
      removed,
    };
  }

  public async syncAllEnabledInBackground(): Promise<{
    accounts: number;
    succeeded: number;
    failed: number;
  }> {
    const rows = await this.accountRepository.find({
      where: { enabled: true },
      order: { createdAt: "ASC" },
    });
    let succeeded = 0;
    let failed = 0;
    for (const account of rows) {
      const outcome = await this.syncAccountRow(account, null);
      if (outcome.ok) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }
    return { accounts: rows.length, succeeded, failed };
  }

  public async pushEventToAccount(
    organizationId: string,
    accountId: string,
    eventId: string,
  ): Promise<{ resourceHref: string; externalUid: string }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.writeEnabled) {
      throw new BadRequestException("Bu hesap için yazma kapalı.");
    }
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizationId },
    });
    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }
    if (event.icsFeedId) {
      throw new BadRequestException(
        "Harici iCal akışından gelen etkinlik CalDAV’a yazılamaz.",
      );
    }
    const password = decryptCalendarCredential(
      account.passwordCiphertext,
      this.configService,
    );
    const externalUid =
      event.externalUid?.trim() || `${event.id}@posta.lerta.com.tr`;
    const ics = await this.buildEventIcsForCalDav(
      event,
      organizationId,
      externalUid,
    );
    const resourceHref =
      event.caldavAccountId === accountId && event.caldavResourceHref
        ? event.caldavResourceHref
        : joinCalDavResourceUrl(
            account.calendarUrl,
            `${externalUid.replace(/[@/]/g, "_")}.ics`,
          );
    const etag = await calDavPutIcs(
      resourceHref,
      account.username,
      password,
      ics,
      event.caldavAccountId === accountId ? event.caldavEtag : null,
    );
    event.caldavAccountId = accountId;
    event.caldavResourceHref = resourceHref;
    event.externalUid = externalUid;
    if (etag) {
      event.caldavEtag = etag;
    }
    await this.eventRepository.save(event);
    return { resourceHref, externalUid };
  }

  public async pushOccurrenceToAccount(
    organizationId: string,
    accountId: string,
    eventId: string,
    occurrenceStartsAt: Date,
  ): Promise<{ resourceHref: string; externalUid: string }> {
    const account = await this.assertAccount(organizationId, accountId);
    if (!account.writeEnabled) {
      throw new BadRequestException("Bu hesap için yazma kapalı.");
    }
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizationId },
    });
    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }
    if (!event.recurrenceRule) {
      throw new BadRequestException("Yalnızca tekrarlı etkinlik örneği yazılır.");
    }
    if (event.icsFeedId) {
      throw new BadRequestException(
        "Harici iCal akışından gelen etkinlik CalDAV’a yazılamaz.",
      );
    }
    const anchor = new Date(occurrenceStartsAt.getTime());
    if (Number.isNaN(anchor.getTime())) {
      throw new BadRequestException("occurrenceStartsAt geçersiz.");
    }
    const exception = await this.recurrenceExceptionRepository.findOne({
      where: {
        organizationId,
        masterEventId: event.id,
        occurrenceStartsAt: anchor,
      },
    });
    if (exception?.cancelled) {
      throw new BadRequestException("İptal edilmiş tekrar CalDAV’a yazılamaz.");
    }
    const durationMs = event.endsAt.getTime() - event.startsAt.getTime();
    const startsAt = exception?.overrideStartsAt ?? anchor;
    const endsAt =
      exception?.overrideEndsAt ??
      new Date(startsAt.getTime() + durationMs);
    const allDay = exception?.overrideAllDay ?? event.allDay;
    const title = exception?.overrideTitle?.trim() || event.title;

    const password = decryptCalendarCredential(
      account.passwordCiphertext,
      this.configService,
    );
    const externalUid =
      event.externalUid?.trim() || `${event.id}@posta.lerta.com.tr`;
    const ics = buildSingleVeventIcal({
      uid: externalUid,
      title,
      description: event.description,
      location: event.location,
      startsAt,
      endsAt,
      allDay,
      recurrenceIdAt: anchor,
      recurrenceIdAllDay: event.allDay,
    });
    const slug = externalUid.replace(/[@/]/g, "_");
    const resourceHref = joinCalDavResourceUrl(
      account.calendarUrl,
      `${slug}_occ_${anchor.getTime()}.ics`,
    );
    const etag = await calDavPutIcs(
      resourceHref,
      account.username,
      password,
      ics,
      null,
    );
    void etag;
    return { resourceHref, externalUid };
  }

  /** Tekrarlı seri CalDAV’a bağlıysa master .ics (RRULE + EXDATE + override) yeniden yaz. */
  public async syncRecurrenceMasterToCalDavIfLinked(
    organizationId: string,
    eventId: string,
  ): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizationId },
    });
    if (
      !event?.recurrenceRule ||
      !event.caldavAccountId ||
      !event.caldavResourceHref
    ) {
      return;
    }
    try {
      await this.pushEventToAccount(
        organizationId,
        event.caldavAccountId,
        eventId,
      );
    } catch {
      // CalDAV senkronu en iyi çaba; silme/iptal API’sini bozmaz.
    }
  }

  public async deleteRemoteForEvent(
    event: MailCalendarEventEntity,
  ): Promise<void> {
    if (!event.caldavAccountId || !event.caldavResourceHref) {
      return;
    }
    const account = await this.accountRepository.findOne({
      where: { id: event.caldavAccountId, organizationId: event.organizationId },
    });
    if (!account || !account.writeEnabled) {
      return;
    }
    const password = decryptCalendarCredential(
      account.passwordCiphertext,
      this.configService,
    );
    try {
      await calDavDeleteResource(
        event.caldavResourceHref,
        account.username,
        password,
        event.caldavEtag,
      );
    } catch {
      // Yerel silme devam etsin; sunucu hatası ingest'i bloklamasın.
    }
  }

  private async syncAccountRow(
    account: MailCalendarCalDavAccountEntity,
    userId: string | null,
  ): Promise<
    | {
        ok: true;
        imported: number;
        updated: number;
        removed: number;
      }
    | { ok: false; error: string }
  > {
    const organizationId = account.organizationId;
    const accountId = account.id;
    try {
      const password = decryptCalendarCredential(
        account.passwordCiphertext,
        this.configService,
      );
      const now = Date.now();
      const from = new Date(now - SYNC_PAST_MS);
      const to = new Date(now + SYNC_FUTURE_MS);
      const icsBlocks = await calDavCalendarQuery(
        account.calendarUrl,
        account.username,
        password,
        from,
        to,
      );
      const parsed = icsBlocks.flatMap((block) =>
        parseIcalEvents(block).filter((ev) => ev.uid),
      );
      const uidSet = new Set(parsed.map((ev) => ev.uid!));
      const existing = await this.eventRepository.find({
        where: { organizationId, caldavAccountId: accountId },
      });
      let removed = 0;
      for (const row of existing) {
        if (row.externalUid && !uidSet.has(row.externalUid)) {
          await this.eventRepository.remove(row);
          removed += 1;
        }
      }
      let imported = 0;
      let updated = 0;
      for (const ev of parsed) {
        const externalUid = ev.uid!;
        const found = await this.eventRepository.findOne({
          where: {
            organizationId,
            caldavAccountId: accountId,
            externalUid,
          },
        });
        if (found) {
          found.title = ev.title;
          found.description = ev.description;
          found.location = ev.location;
          found.startsAt = ev.startsAt;
          found.endsAt = ev.endsAt;
          found.allDay = ev.allDay;
          await this.eventRepository.save(found);
          updated += 1;
        } else {
          await this.eventRepository.save(
            this.eventRepository.create({
              organizationId,
              title: ev.title,
              description: ev.description,
              location: ev.location,
              startsAt: ev.startsAt,
              endsAt: ev.endsAt,
              allDay: ev.allDay,
              createdByUserId: userId,
              caldavAccountId: accountId,
              externalUid,
              caldavResourceHref: null,
            }),
          );
          imported += 1;
        }
      }
      account.lastSyncedAt = new Date();
      account.lastSyncError = null;
      await this.accountRepository.save(account);
      return { ok: true, imported, updated, removed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CalDAV senkron başarısız.";
      account.lastSyncError = message.slice(0, 500);
      await this.accountRepository.save(account);
      return { ok: false, error: message };
    }
  }

  private normalizeCalendarUrl(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length < 12) {
      throw new BadRequestException("Geçersiz takvim URL.");
    }
    const url = this.assertSafeHttpsUrl(trimmed);
    return url.toString().endsWith("/") ? url.toString() : `${url.toString()}/`;
  }

  private assertSafeHttpsUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException("Geçersiz URL.");
    }
    if (url.protocol !== "https:") {
      throw new BadRequestException("Yalnızca HTTPS CalDAV URL desteklenir.");
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      throw new BadRequestException("Bu URL adresine izin verilmiyor.");
    }
    return url;
  }

  private async buildEventIcsForCalDav(
    event: MailCalendarEventEntity,
    organizationId: string,
    externalUid: string,
  ): Promise<string> {
    if (!event.recurrenceRule?.trim()) {
      return buildSingleVeventIcal({
        uid: externalUid,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        allDay: event.allDay,
      });
    }
    const exceptions = await this.recurrenceExceptionRepository.find({
      where: { organizationId, masterEventId: event.id },
      order: { occurrenceStartsAt: "ASC" },
    });
    const exDates = exceptions
      .filter((row) => row.cancelled)
      .map((row) => row.occurrenceStartsAt);
    const durationMs = event.endsAt.getTime() - event.startsAt.getTime();
    const overrides: CalDavRecurrenceOverrideVevent[] = [];
    for (const ex of exceptions.filter((row) => !row.cancelled)) {
      const hasOverride = Boolean(
        ex.overrideTitle?.trim() ||
          ex.overrideStartsAt ||
          ex.overrideEndsAt ||
          ex.overrideAllDay != null,
      );
      if (!hasOverride) {
        continue;
      }
      const startsAt = ex.overrideStartsAt ?? ex.occurrenceStartsAt;
      const endsAt =
        ex.overrideEndsAt ?? new Date(startsAt.getTime() + durationMs);
      overrides.push({
        recurrenceIdAt: ex.occurrenceStartsAt,
        recurrenceIdAllDay: event.allDay,
        title: ex.overrideTitle?.trim() || event.title,
        description: event.description,
        location: event.location,
        startsAt,
        endsAt,
        allDay: ex.overrideAllDay ?? event.allDay,
      });
    }
    return buildCalDavRecurringSeriesIcal({
      uid: externalUid,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      recurrenceRule: event.recurrenceRule,
      recurrenceUntil: event.recurrenceUntil,
      exDates,
      exDatesAllDay: event.allDay,
      overrides,
    });
  }

  private async assertAccount(
    organizationId: string,
    accountId: string,
  ): Promise<MailCalendarCalDavAccountEntity> {
    const row = await this.accountRepository.findOne({
      where: { id: accountId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("CalDAV hesabı bulunamadı.");
    }
    return row;
  }

  private toDto(row: MailCalendarCalDavAccountEntity): MailCalendarCalDavAccountDto {
    return {
      id: row.id,
      label: row.label,
      calendarUrl: row.calendarUrl,
      username: row.username,
      enabled: row.enabled,
      writeEnabled: row.writeEnabled,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
