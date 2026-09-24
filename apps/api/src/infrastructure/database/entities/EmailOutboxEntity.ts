import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type EmailOutboxStatus = "pending" | "sent" | "failed";

@Entity({ name: "email_outbox" })
export class EmailOutboxEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 64 })
  public eventCode!: string;

  @Column({ type: "varchar", length: 16 })
  public recipientKind!: string;

  @Column({ type: "varchar", length: 320 })
  public recipientEmail!: string;

  @Column({ type: "varchar", length: 8, default: "tr" })
  public locale!: string;

  @Column({ type: "varchar", length: 255 })
  public subject!: string;

  @Column({ type: "text" })
  public htmlBody!: string;

  @Column({ type: "text" })
  public textBody!: string;

  @Column({ type: "varchar", length: 16, default: "pending" })
  public status!: EmailOutboxStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  public providerMessageId!: string | null;

  @Column({ type: "text", nullable: true })
  public lastError!: string | null;

  @Column({ type: "varchar", length: 128 })
  public idempotencyKey!: string;

  @Column({ type: "jsonb", nullable: true })
  public metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public sentAt!: Date | null;

  @Column({ type: "int", default: 0 })
  public openCount!: number;

  @Column({ type: "int", default: 0 })
  public clickCount!: number;

  @Column({ type: "timestamptz", nullable: true })
  public firstOpenedAt!: Date | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  public bounceClass!: string | null;
}
