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

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
