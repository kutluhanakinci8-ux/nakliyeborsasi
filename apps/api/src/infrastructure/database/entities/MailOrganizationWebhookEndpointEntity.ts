import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailWebhookEventType =
  | "message.sent"
  | "message.failed"
  | "inbound.received";

@Entity({ name: "mail_organization_webhook_endpoint" })
export class MailOrganizationWebhookEndpointEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 2048 })
  public url!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  public description!: string | null;

  @Column({ type: "jsonb" })
  public events!: MailWebhookEventType[];

  /** HMAC imza (sunucu tarafı; API yanıtlarında gösterilmez). */
  @Column({ type: "varchar", length: 96 })
  public signingSecret!: string;

  @Column({ type: "varchar", length: 16 })
  public signingSecretPrefix!: string;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
