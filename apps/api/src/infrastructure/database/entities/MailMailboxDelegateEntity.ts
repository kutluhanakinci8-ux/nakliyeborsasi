import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type MailMailboxDelegatePermission = "read" | "send" | "manage";

@Entity({ name: "mail_mailbox_delegate" })
@Index(["mailboxId", "delegateUserId"], { unique: true })
@Index(["delegateUserId"])
export class MailMailboxDelegateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "mailbox_id", type: "uuid" })
  public mailboxId!: string;

  @Column({ name: "delegate_user_id", type: "uuid" })
  public delegateUserId!: string;

  @Column({ type: "varchar", length: 16, default: "send" })
  public permission!: MailMailboxDelegatePermission;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  public createdByUserId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;
}
