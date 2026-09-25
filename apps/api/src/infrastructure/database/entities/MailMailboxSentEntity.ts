import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_mailbox_sent" })
export class MailMailboxSentEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "uuid" })
  public mailboxId!: string;

  @Column({ type: "varchar", length: 320 })
  public fromAddress!: string;

  @Column({ type: "varchar", length: 320 })
  public toAddress!: string;

  @Column({ type: "varchar", length: 500 })
  public subject!: string;

  @Column({ type: "text", nullable: true })
  public bodyText!: string | null;

  @Column({ type: "uuid", nullable: true })
  public relatedInboundMessageId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  public smtpMessageId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public sentAt!: Date;
}
