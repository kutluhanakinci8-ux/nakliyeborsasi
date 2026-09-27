import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_inbox_preferences" })
export class MailInboxPreferencesEntity {
  @PrimaryColumn({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "boolean", default: true })
  public dailyDigestEnabled!: boolean;

  @Column({ type: "boolean", default: false })
  public autoReplyEnabled!: boolean;

  @Column({ type: "text", nullable: true })
  public autoReplyBodyText!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  public autoReplyActiveFrom!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public autoReplyActiveUntil!: Date | null;

  /** comfortable | compact */
  @Column({ type: "varchar", length: 16, default: "comfortable" })
  public inboxListDensity!: string;

  /** Europe/Istanbul takvim günü (YYYY-MM-DD) */
  @Column({ type: "varchar", length: 10, nullable: true })
  public lastDigestSentOn!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
