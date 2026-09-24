import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "platform_notification_settings" })
export class PlatformNotificationSettingEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  public eventCode!: string;

  @Column({ type: "boolean", default: true })
  public adminEmailEnabled!: boolean;

  @Column({ type: "boolean", default: true })
  public userEmailEnabled!: boolean;

  @Column({ type: "jsonb", default: [] })
  public adminRecipientEmails!: string[];

  /** Faz A üretim varsayılanları (tek seferlik senkron) */
  @Column({ type: "jsonb", nullable: true })
  public metadata!: Record<string, unknown> | null;
}
