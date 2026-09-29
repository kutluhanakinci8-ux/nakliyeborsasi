import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MessagingWebhookEventType = "message.created" | "thread.opened";

@Entity({ name: "company_messaging_webhook_endpoint" })
export class CompanyMessagingWebhookEndpointEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "company_id", type: "uuid" })
  public companyId!: string;

  @Column({ type: "varchar", length: 2048 })
  public url!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  public description!: string | null;

  @Column({ type: "jsonb" })
  public events!: MessagingWebhookEventType[];

  @Column({ name: "signing_secret", type: "varchar", length: 96 })
  public signingSecret!: string;

  @Column({ name: "signing_secret_prefix", type: "varchar", length: 16 })
  public signingSecretPrefix!: string;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
