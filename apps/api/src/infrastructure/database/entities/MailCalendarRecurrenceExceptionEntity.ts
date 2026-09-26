import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_calendar_recurrence_exception" })
@Index(["organizationId"])
@Index(["masterEventId", "occurrenceStartsAt"], { unique: true })
export class MailCalendarRecurrenceExceptionEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "master_event_id", type: "uuid" })
  public masterEventId!: string;

  @Column({ name: "occurrence_starts_at", type: "timestamptz" })
  public occurrenceStartsAt!: Date;

  @Column({ type: "boolean", default: true })
  public cancelled!: boolean;

  @Column({ name: "override_title", type: "varchar", length: 200, nullable: true })
  public overrideTitle!: string | null;

  @Column({ name: "override_starts_at", type: "timestamptz", nullable: true })
  public overrideStartsAt!: Date | null;

  @Column({ name: "override_ends_at", type: "timestamptz", nullable: true })
  public overrideEndsAt!: Date | null;

  @Column({ name: "override_all_day", type: "boolean", nullable: true })
  public overrideAllDay!: boolean | null;

  /** CalDAV sync ile yazıldıysa true; yerel-only istisnalar prune edilmez. */
  @Column({ name: "from_caldav", type: "boolean", default: false })
  public fromCaldav!: boolean;

  /** Son başarılı `_occ_<ms>.ics` push anahtarı (anchor taşımada eski dosya silinir). */
  @Column({
    name: "caldav_occurrence_pushed_at_ms",
    type: "bigint",
    nullable: true,
  })
  public caldavOccurrencePushedAtMs!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
