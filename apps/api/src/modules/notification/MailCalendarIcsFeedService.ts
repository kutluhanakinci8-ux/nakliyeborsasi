import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCalendarIcsFeedEntity } from "../../infrastructure/database/entities/MailCalendarIcsFeedEntity";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import { parseIcalEvents } from "./MailIcalUtil";

const MAX_FEEDS = 5;
const FETCH_TIMEOUT_MS = 20_000;

export type MailCalendarIcsFeedDto = {
  id: string;
  label: string;
  feedUrl: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailCalendarIcsFeedService {
  public constructor(
    @InjectRepository(MailCalendarIcsFeedEntity)
    private readonly feedRepository: Repository<MailCalendarIcsFeedEntity>,
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
  ) {}

  public async list(organizationId: string): Promise<MailCalendarIcsFeedDto[]> {
    const rows = await this.feedRepository.find({
      where: { organizationId },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => this.toDto(row));
  }

  public async create(
    organizationId: string,
    input: { label: string; feedUrl: string; enabled?: boolean },
  ): Promise<MailCalendarIcsFeedDto> {
    const count = await this.feedRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_FEEDS) {
      throw new BadRequestException(`En fazla ${MAX_FEEDS} harici takvim URL'si.`);
    }
    const feedUrl = this.normalizeFeedUrl(input.feedUrl);
    const row = await this.feedRepository.save(
      this.feedRepository.create({
        organizationId,
        label: input.label.trim(),
        feedUrl,
        enabled: input.enabled ?? true,
        lastSyncedAt: null,
        lastSyncError: null,
      }),
    );
    return this.toDto(row);
  }

  public async update(
    organizationId: string,
    feedId: string,
    input: {
      label?: string;
      feedUrl?: string;
      enabled?: boolean;
    },
  ): Promise<MailCalendarIcsFeedDto> {
    const row = await this.assertFeed(organizationId, feedId);
    if (input.label !== undefined) {
      row.label = input.label.trim();
    }
    if (input.feedUrl !== undefined) {
      row.feedUrl = this.normalizeFeedUrl(input.feedUrl);
    }
    if (input.enabled !== undefined) {
      row.enabled = input.enabled;
    }
    await this.feedRepository.save(row);
    return this.toDto(row);
  }

  public async delete(organizationId: string, feedId: string): Promise<void> {
    await this.assertFeed(organizationId, feedId);
    await this.eventRepository.delete({
      organizationId,
      icsFeedId: feedId,
    });
    await this.feedRepository.delete({ id: feedId, organizationId });
  }

  public async sync(
    organizationId: string,
    feedId: string,
    userId: string,
  ): Promise<{ imported: number; updated: number; removed: number }> {
    const feed = await this.assertFeed(organizationId, feedId);
    if (!feed.enabled) {
      throw new BadRequestException("Bu akış devre dışı.");
    }
    try {
      const icsText = await this.fetchFeed(feed.feedUrl);
      const parsed = parseIcalEvents(icsText).filter((ev) => ev.uid);
      const uidSet = new Set(parsed.map((ev) => ev.uid!));
      const existing = await this.eventRepository.find({
        where: { organizationId, icsFeedId: feedId },
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
            icsFeedId: feedId,
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
              icsFeedId: feedId,
              externalUid,
            }),
          );
          imported += 1;
        }
      }
      feed.lastSyncedAt = new Date();
      feed.lastSyncError = null;
      await this.feedRepository.save(feed);
      return { imported, updated, removed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Senkron başarısız.";
      feed.lastSyncError = message.slice(0, 500);
      await this.feedRepository.save(feed);
      throw new BadRequestException(message);
    }
  }

  private async fetchFeed(feedUrl: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(feedUrl, {
        method: "GET",
        headers: {
          Accept: "text/calendar, text/plain, */*",
          "User-Agent": "Lerta-Posta-Calendar-Sync/1.0",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      if (text.length > 2_000_000) {
        throw new Error("Takvim dosyası çok büyük.");
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeFeedUrl(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length < 12) {
      throw new BadRequestException("Geçersiz URL.");
    }
    const url = this.assertSafeFeedUrl(trimmed);
    return url.toString();
  }

  private assertSafeFeedUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException("Geçersiz URL.");
    }
    if (url.protocol !== "https:") {
      throw new BadRequestException("Yalnızca HTTPS iCal URL desteklenir.");
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

  private async assertFeed(
    organizationId: string,
    feedId: string,
  ): Promise<MailCalendarIcsFeedEntity> {
    const row = await this.feedRepository.findOne({
      where: { id: feedId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Harici takvim bulunamadı.");
    }
    return row;
  }

  private toDto(row: MailCalendarIcsFeedEntity): MailCalendarIcsFeedDto {
    return {
      id: row.id,
      label: row.label,
      feedUrl: row.feedUrl,
      enabled: row.enabled,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastSyncError: row.lastSyncError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
