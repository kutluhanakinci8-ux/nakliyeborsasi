import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "user_notification_preferences" })
export class UserNotificationPreferenceEntity {
  @PrimaryColumn({ type: "uuid" })
  public userId!: string;

  @Column({ type: "boolean", default: true })
  public notifyNewOffers!: boolean;

  @Column({ type: "boolean", default: true })
  public notifyMessages!: boolean;

  @Column({ type: "boolean", default: true })
  public notifyAuctions!: boolean;

  @Column({ type: "boolean", default: false })
  public notifyWeeklyDigest!: boolean;

  @Column({ name: "ai_mail_assist_consent", type: "boolean", default: false })
  public aiMailAssistConsent!: boolean;

  @Column({ name: "ai_mail_assent_at", type: "timestamptz", nullable: true })
  public aiMailAssentAt!: Date | null;

  @Column({ name: "notify_push_new_offers", type: "boolean", default: true })
  public notifyPushNewOffers!: boolean;

  @Column({ name: "notify_push_messages", type: "boolean", default: true })
  public notifyPushMessages!: boolean;

  @Column({ name: "notify_push_auctions", type: "boolean", default: true })
  public notifyPushAuctions!: boolean;

  @Column({ name: "notify_push_messaging_chat", type: "boolean", default: true })
  public notifyPushMessagingChat!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
