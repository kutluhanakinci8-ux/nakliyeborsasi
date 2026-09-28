import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type EmailMarketingCampaignStatus =
  | "draft"
  | "sending"
  | "sent"
  | "cancelled";

@Entity({ name: "email_marketing_campaigns" })
export class EmailMarketingCampaignEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "varchar", length: 160 })
  public name!: string;

  @Column({ type: "uuid" })
  public segmentId!: string;

  @Column({ type: "varchar", length: 255 })
  public subjectA!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  public subjectB!: string | null;

  @Column({ type: "boolean", default: false })
  public abTestEnabled!: boolean;

  @Column({ type: "text" })
  public htmlBody!: string;

  @Column({ type: "text" })
  public textBody!: string;

  @Column({ type: "varchar", length: 24, default: "draft" })
  public status!: EmailMarketingCampaignStatus;

  @Column({ type: "int", default: 0 })
  public recipientsTargeted!: number;

  @Column({ type: "int", default: 0 })
  public recipientsEnqueued!: number;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  public sentAt!: Date | null;
}
