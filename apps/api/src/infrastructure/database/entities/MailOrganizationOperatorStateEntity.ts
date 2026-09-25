import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_organization_operator_state" })
export class MailOrganizationOperatorStateEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", unique: true })
  public organizationId!: string;

  @Column({ type: "boolean", default: false })
  public suspended!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  public suspendReason!: string | null;

  @Column({ type: "boolean", default: false })
  public abuseFlag!: boolean;

  @Column({ name: "require_totp_for_console", type: "boolean", default: false })
  public requireTotpForConsole!: boolean;

  @Column({ type: "text", nullable: true })
  public operatorNote!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  public suspendedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  public updatedByUserId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
