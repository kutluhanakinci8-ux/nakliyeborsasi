import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_calendar_ics_feed" })
@Index(["organizationId"])
export class MailCalendarIcsFeedEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 120 })
  public label!: string;

  @Column({ name: "feed_url", type: "varchar", length: 2000 })
  public feedUrl!: string;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @Column({ name: "last_synced_at", type: "timestamptz", nullable: true })
  public lastSyncedAt!: Date | null;

  @Column({ name: "last_sync_error", type: "varchar", length: 500, nullable: true })
  public lastSyncError!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
