import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_social_settings" })
export class CompanySocialSettingsEntity {
  @PrimaryColumn({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "boolean", default: true })
  public inboxEnabled!: boolean;

  @Column({ type: "boolean", default: true })
  public publishingEnabled!: boolean;

  @Column({ type: "boolean", default: false })
  public dispatcherCanReply!: boolean;

  @Column({ type: "boolean", default: false })
  public dispatcherCanPublish!: boolean;

  @Column({ type: "boolean", default: true })
  public ownerApprovalRequired!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public kvkkAcceptedAt!: Date | null;

  @Column({ type: "boolean", default: true })
  public healthAlertsEnabled!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public healthAlertLastSentAt!: Date | null;

  @Column({ type: "varchar", length: 24, nullable: true })
  public lastHealthAlertStatus!: string | null;

  @Column({ type: "varchar", length: 16, default: "attention" })
  public healthAlertMinSeverity!: "attention" | "critical";

  @Column({ type: "int", default: 1 })
  public healthAlertFailureThreshold!: number;

  @Column({ type: "text", nullable: true })
  public healthAlertPlatformThresholdsJson!: string | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  public socialSlackWebhookUrl!: string | null;

  @Column({ type: "boolean", default: true })
  public socialSlackUseMessagingFallback!: boolean;

  @Column({ type: "boolean", default: false })
  public socialSlackNotifyOutboundFailures!: boolean;

  @Column({ type: "int", default: 15 })
  public socialSlackOutboundFailureCooldownMinutes!: number;

  @Column({ type: "boolean", default: false })
  public socialSlackDailyDigestEnabled!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public socialSlackDailyDigestLastSentAt!: Date | null;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
