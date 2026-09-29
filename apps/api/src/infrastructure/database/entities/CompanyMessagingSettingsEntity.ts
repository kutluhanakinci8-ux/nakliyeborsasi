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

  /** `email` | `chat` — Mesajlar hub varsayılan sekme */
  @Column({ name: "default_hub_tab", type: "varchar", length: 16, default: "email" })
  public defaultHubTab!: string;

  /** FS-11: şirket özel hazır şablonlar (max 20, sistem şablonları ayrı). */
  @Column({ name: "org_quick_reply_templates", type: "jsonb", nullable: true })
  public orgQuickReplyTemplates!: CompanyOrgQuickReplyTemplate[] | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}

export type CompanyOrgQuickReplyTemplate = {
  id: string;
  labelTr: string;
  labelEn?: string;
  bodyText: string;
  category?: string;
};
