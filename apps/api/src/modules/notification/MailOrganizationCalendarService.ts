import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailCalendarEventEntity } from "../../infrastructure/database/entities/MailCalendarEventEntity";
import { buildIcalCalendar, parseIcalEvents } from "./MailIcalUtil";

const MAX_EVENTS = 500;

export type MailCalendarEventDto = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MailOrganizationCalendarService {
  public constructor(
    @InjectRepository(MailCalendarEventEntity)
    private readonly eventRepository: Repository<MailCalendarEventEntity>,
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
      .andWhere("e.startsAt < :to", { to })
      .andWhere("e.endsAt > :from", { from })
      .orderBy("e.startsAt", "ASC")
      .getMany();
    return rows.map((row) => this.toDto(row));
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
    },
  ): Promise<MailCalendarEventDto> {
    this.validateEventInput(input);
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
      }),
    );
    return this.toDto(row);
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
    this.validateEventInput({
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    });
    await this.eventRepository.save(row);
    return this.toDto(row);
  }

  public async delete(organizationId: string, eventId: string): Promise<void> {
    const row = await this.assertEvent(organizationId, eventId);
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

  private toDto(row: MailCalendarEventEntity): MailCalendarEventDto {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      allDay: row.allDay,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
