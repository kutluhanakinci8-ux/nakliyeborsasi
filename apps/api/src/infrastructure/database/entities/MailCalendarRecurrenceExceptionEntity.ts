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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
