import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type EmailEngagementEventType = "open" | "click" | "bounce";

@Entity({ name: "email_outbox_engagement_events" })
@Index(["outboxId", "eventType"])
@Index(["occurredAt"])
export class EmailOutboxEngagementEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public outboxId!: string;

  @Column({ type: "varchar", length: 16 })
  public eventType!: EmailEngagementEventType;

  @Column({ type: "text", nullable: true })
  public linkUrl!: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  public bounceClass!: string | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  public smtpCode!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  public userAgent!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  public ipAddress!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public occurredAt!: Date;
}
