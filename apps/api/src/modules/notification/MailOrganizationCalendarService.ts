import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import { MailCalendarCalDavService } from "./MailCalendarCalDavService";
import { buildIcalCalendar, parseIcalEvents } from "./MailIcalUtil";
import {
  expandEventOccurrences,
  frequencyToRrule,
  type RecurrenceFrequency,
  validateRecurrenceRule,
} from "./MailRruleUtil";

const MAX_EVENTS = 500;

export type MailCalendarEventDto = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
  isRecurrenceOccurrence: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailOrganizationCalendarService {
  public constructor(
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
    private readonly mailCalendarCalDavService: MailCalendarCalDavService,
  ) {}

  public async listInRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<MailCalendarEventDto[]> {
    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException("Bitiş tarihi başlangıçtan sonra olmalı.");
    }
    const rows = await this.eventRepository
      .createQueryBuilder("e")
      .where("e.organizationId = :organizationId", { organizationId })
      .andWhere(
        `(
          (e.recurrence_rule IS NULL AND e.starts_at < :to AND e.ends_at > :from)
          OR
          (e.recurrence_rule IS NOT NULL AND e.starts_at < :to AND (e.recurrence_until IS NULL OR e.recurrence_until > :from))
        )`,
        { from, to },
      )
      .orderBy("e.startsAt", "ASC")
      .getMany();
    const expanded: MailCalendarEventDto[] = [];
    for (const row of rows) {
      if (!row.recurrenceRule) {
        expanded.push(this.toDto(row, false));
        continue;
      }
      const occurrences = expandEventOccurrences({
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        recurrenceRule: row.recurrenceRule,
        recurrenceUntil: row.recurrenceUntil,
        rangeFrom: from,
        rangeTo: to,
      });
      for (let i = 0; i < occurrences.length; i += 1) {
        const occ = occurrences[i]!;
        expanded.push(
          this.toDto(
            row,
            i > 0 || occ.startsAt.getTime() !== row.startsAt.getTime(),
            occ.startsAt,
            occ.endsAt,
          ),
        );
      }
    }
    expanded.sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return expanded;
  }

  public async create(
    organizationId: string,
    userId: string,
    input: {
      title: string;
      description?: string | null;
      location?: string | null;
      startsAt: Date;
      endsAt: Date;
      allDay?: boolean;
      recurrenceFrequency?: RecurrenceFrequency | null;
      recurrenceUntil?: Date | null;
    },
  ): Promise<MailCalendarEventDto> {
    this.validateEventInput(input);
    const recurrenceRule = this.resolveRecurrenceRule(
      input.recurrenceFrequency,
      null,
    );
    const count = await this.eventRepository.count({
      where: { organizationId },
    });
    if (count >= MAX_EVENTS) {
      throw new BadRequestException(
        `En fazla ${MAX_EVENTS} takvim etkinliği.`,
      );
    }
    const row = await this.eventRepository.save(
      this.eventRepository.create({
        organizationId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        allDay: Boolean(input.allDay),
        createdByUserId: userId,
        recurrenceRule,
        recurrenceUntil: input.recurrenceUntil ?? null,
      }),
    );
    return this.toDto(row, false);
  }

  public async update(
    organizationId: string,
    eventId: string,
    input: {
      title?: string;
      description?: string | null;
      location?: string | null;
      startsAt?: Date;
      endsAt?: Date;
      allDay?: boolean;
      recurrenceFrequency?: RecurrenceFrequency | null;
      recurrenceUntil?: Date | null;
    },
  ): Promise<MailCalendarEventDto> {
    const row = await this.assertEvent(organizationId, eventId);
    if (input.title !== undefined) {
      row.title = input.title.trim();
    }
    if (input.description !== undefined) {
      row.description = input.description?.trim() || null;
    }
    if (input.location !== undefined) {
      row.location = input.location?.trim() || null;
    }
    if (input.startsAt !== undefined) {
      row.startsAt = input.startsAt;
    }
    if (input.endsAt !== undefined) {
      row.endsAt = input.endsAt;
    }
    if (input.allDay !== undefined) {
      row.allDay = input.allDay;
    }
    if (
      input.recurrenceFrequency !== undefined ||
      input.recurrenceUntil !== undefined
    ) {
      row.recurrenceRule = this.resolveRecurrenceRule(
        input.recurrenceFrequency ?? null,
        row.recurrenceRule,
      );
      if (input.recurrenceUntil !== undefined) {
        row.recurrenceUntil = input.recurrenceUntil;
      }
    }
    this.validateEventInput({
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    });
    await this.eventRepository.save(row);
    return this.toDto(row, false);
  }

  public async delete(organizationId: string, eventId: string): Promise<void> {
    const row = await this.assertEvent(organizationId, eventId);
    await this.mailCalendarCalDavService.deleteRemoteForEvent(row);
    await this.eventRepository.remove(row);
  }

  public async exportIcs(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<string> {
    const rows = await this.eventRepository
      .createQueryBuilder("e")
      .where("e.organizationId = :organizationId", { organizationId })
      .andWhere("e.startsAt < :to", { to })
      .andWhere("e.endsAt > :from", { from })
      .orderBy("e.startsAt", "ASC")
      .getMany();
    return buildIcalCalendar(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        location: row.location,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        allDay: row.allDay,
        recurrenceRule: row.recurrenceRule,
        recurrenceUntil: row.recurrenceUntil,
      })),
    );
  }

  public async importIcs(
    organizationId: string,
    userId: string,
    icsText: string,
  ): Promise<{ imported: number; skipped: number }> {
    const trimmed = icsText.trim();
    if (trimmed.length < 20) {
      throw new BadRequestException("Geçersiz iCal içeriği.");
    }
    if (trimmed.length > 500_000) {
      throw new BadRequestException("iCal dosyası çok büyük.");
    }
    const parsed = parseIcalEvents(trimmed);
    if (parsed.length === 0) {
      throw new BadRequestException("iCal içinde VEVENT bulunamadı.");
    }
    const count = await this.eventRepository.count({
      where: { organizationId },
    });
    let imported = 0;
    let skipped = 0;
    for (const ev of parsed) {
      if (count + imported >= MAX_EVENTS) {
        skipped += parsed.length - imported - skipped;
        break;
      }
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
          recurrenceRule: this.safeRecurrenceRule(ev.recurrenceRule),
          recurrenceUntil: null,
        }),
      );
      imported += 1;
    }
    return { imported, skipped };
  }

  private async assertEvent(
    organizationId: string,
    eventId: string,
  ): Promise<MailCalendarEventEntity> {
    const row = await this.eventRepository.findOne({
      where: { id: eventId, organizationId },
    });
    if (!row) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }
    return row;
  }

  private validateEventInput(input: {
    title: string;
    startsAt: Date;
    endsAt: Date;
  }): void {
    if (!input.title?.trim()) {
      throw new BadRequestException("Başlık gerekli.");
    }
    if (input.endsAt.getTime() < input.startsAt.getTime()) {
      throw new BadRequestException("Bitiş başlangıçtan önce olamaz.");
    }
  }

  private safeRecurrenceRule(rule: string | null): string | null {
    if (!rule?.trim()) {
      return null;
    }
    try {
      return validateRecurrenceRule(rule);
    } catch {
      return null;
    }
  }

  private resolveRecurrenceRule(
    frequency: RecurrenceFrequency | null | undefined,
    existing: string | null,
  ): string | null {
    if (frequency === null) {
      return null;
    }
    if (frequency === undefined) {
      return existing;
    }
    return frequencyToRrule(frequency);
  }

  private toDto(
    row: MailCalendarEventEntity,
    isRecurrenceOccurrence: boolean,
    startsAt?: Date,
    endsAt?: Date,
  ): MailCalendarEventDto {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      startsAt: (startsAt ?? row.startsAt).toISOString(),
      endsAt: (endsAt ?? row.endsAt).toISOString(),
      allDay: row.allDay,
      recurrenceRule: row.recurrenceRule,
      recurrenceUntil: row.recurrenceUntil?.toISOString() ?? null,
      isRecurrenceOccurrence,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
