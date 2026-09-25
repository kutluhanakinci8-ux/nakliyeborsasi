import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type MailInboundAttachmentMeta = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
};

@Entity({ name: "mail_inbound_message" })
export class MailInboundMessageEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public mailboxId!: string;

  @Column({ type: "varchar", length: 320 })
  public fromAddress!: string;

  @Column({ type: "varchar", length: 500 })
  public subject!: string;

  @Column({ type: "text", nullable: true })
  public snippet!: string | null;

  @Column({ type: "text", nullable: true })
  public bodyText!: string | null;

  @Column({ type: "text", nullable: true })
  public rawMimePath!: string | null;

  @Column({ type: "varchar", length: 16, default: "clean" })
  public spamStatus!: "clean" | "suspected" | "blocked";

  @Column({ type: "varchar", length: 255, nullable: true })
  public spamReason!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  public internetMessageId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  public attachments!: MailInboundAttachmentMeta[] | null;

  @Column({ type: "timestamptz", nullable: true })
  public readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public receivedAt!: Date;
}
