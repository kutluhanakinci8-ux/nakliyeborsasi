import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailDeletionRequestStatus =
  | "pending"
  | "cancelled"
  | "completed";

@Entity({ name: "mail_organization_deletion_request" })
export class MailOrganizationDeletionRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "requested_by_user_id", type: "uuid" })
  public requestedByUserId!: string;

  @Column({ type: "varchar", length: 16, default: "pending" })
  public status!: MailDeletionRequestStatus;

  @Column({ type: "text", nullable: true })
  public reason!: string | null;

  @Column({ name: "execute_after", type: "timestamptz" })
  public executeAfter!: Date;

  @Column({ name: "confirm_token_hash", type: "varchar", length: 64 })
  public confirmTokenHash!: string;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  public completedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
