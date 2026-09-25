import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailBillingLifecycleStatus =
  | "active"
  | "past_due"
  | "grace"
  | "canceled"
  | "trialing";

@Entity({ name: "mail_organization_billing_state" })
export class MailOrganizationBillingStateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", unique: true })
  public organizationId!: string;

  @Column({ type: "varchar", length: 32, default: "manual" })
  public billingProvider!: string;

  @Column({ type: "varchar", length: 32, default: "trialing" })
  public lifecycleStatus!: MailBillingLifecycleStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  public stripeSubscriptionId!: string | null;

  @Column({ type: "boolean", default: false })
  public cancelAtPeriodEnd!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  public currentPeriodEnd!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public graceEndsAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public lastPaymentFailedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
