import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

export type MessagingRetentionMode = "archive" | "delete";

@Entity({ name: "company_messaging_settings" })
export class CompanyMessagingSettingsEntity {
  @PrimaryColumn({ name: "company_id", type: "uuid" })
  public companyId!: string;

  @Column({ name: "retention_days", type: "int", nullable: true })
  public retentionDays!: number | null;

  @Column({ name: "retention_mode", type: "varchar", length: 16, default: "archive" })
  public retentionMode!: MessagingRetentionMode;

  @Column({ name: "slack_incoming_webhook_url", type: "varchar", length: 2048, nullable: true })
  public slackIncomingWebhookUrl!: string | null;

  @Column({ name: "slack_bridge_enabled", type: "boolean", default: false })
  public slackBridgeEnabled!: boolean;

  @Column({ name: "whatsapp_notify_e164", type: "varchar", length: 24, nullable: true })
  public whatsappNotifyE164!: string | null;

  @Column({ name: "whatsapp_bridge_enabled", type: "boolean", default: false })
  public whatsappBridgeEnabled!: boolean;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
