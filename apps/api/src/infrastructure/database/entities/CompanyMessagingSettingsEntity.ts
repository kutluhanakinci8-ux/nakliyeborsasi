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

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
