import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

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

  @Column({ type: "timestamptz", nullable: true })
  public readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public receivedAt!: Date;
}
