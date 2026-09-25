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

  /** Europe/Istanbul takvim günü (YYYY-MM-DD) */
  @Column({ type: "varchar", length: 10, nullable: true })
  public lastDigestSentOn!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
