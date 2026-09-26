import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_calendar_event" })
@Index(["organizationId", "startsAt"])
export class MailCalendarEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 200 })
  public title!: string;

  @Column({ type: "text", nullable: true })
  public description!: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  public location!: string | null;

  @Column({ name: "starts_at", type: "timestamptz" })
  public startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  public endsAt!: Date;

  @Column({ name: "all_day", type: "boolean", default: false })
  public allDay!: boolean;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  public createdByUserId!: string | null;

  @Column({ name: "ics_feed_id", type: "uuid", nullable: true })
  public icsFeedId!: string | null;

  @Column({ name: "external_uid", type: "varchar", length: 320, nullable: true })
  public externalUid!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
