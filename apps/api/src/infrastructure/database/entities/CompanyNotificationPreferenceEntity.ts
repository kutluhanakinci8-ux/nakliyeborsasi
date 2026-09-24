import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "company_notification_preferences" })
export class CompanyNotificationPreferenceEntity {
  @PrimaryColumn({ type: "uuid" })
  public companyId!: string;

  @Column({ type: "boolean", default: true })
  public emailOpsEnabled!: boolean;

  @Column({ type: "jsonb", default: [] })
  public extraRecipientEmails!: string[];

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
