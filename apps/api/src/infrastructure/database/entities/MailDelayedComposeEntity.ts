import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailDelayedComposeAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type MailDelayedComposePayload = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailDelayedComposeAttachment[];
};

export type MailDelayedSendPayload =
  | ({
      kind: "compose";
    } & MailDelayedComposePayload)
  | {
      kind: "reply";
      inboundMessageId: string;
      text: string;
      bcc?: string;
      attachments?: MailDelayedComposeAttachment[];
    }
  | {
      kind: "forward";
      inboundMessageId: string;
      to: string;
      text?: string;
      includeOriginal?: boolean;
      attachments?: MailDelayedComposeAttachment[];
    };

export type MailDelayedStoredPayload =
  | MailDelayedSendPayload
  | MailDelayedComposePayload;

export type MailDelayedComposeStatus =
  | "pending"
  | "cancelled"
  | "sent"
  | "failed";

@Entity({ name: "mail_delayed_compose" })
@Index(["status", "sendAfter"])
@Index(["organizationId", "status"])
export class MailDelayedComposeEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 16, default: "pending" })
  public status!: MailDelayedComposeStatus;

  @Column({ type: "timestamptz" })
  public sendAfter!: Date;

  @Column({ type: "jsonb" })
  public payload!: MailDelayedStoredPayload;

  @Column({ type: "uuid", nullable: true })
  public sentId!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  public errorMessage!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
