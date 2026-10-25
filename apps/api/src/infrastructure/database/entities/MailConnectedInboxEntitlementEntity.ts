import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_connected_inbox_entitlement" })
export class MailConnectedInboxEntitlementEntity {
  @PrimaryColumn({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "premium_enabled", type: "boolean", default: true })
  public premiumEnabled!: boolean;

  @Column({ name: "max_connected_accounts", type: "int", default: 10 })
  public maxConnectedAccounts!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
