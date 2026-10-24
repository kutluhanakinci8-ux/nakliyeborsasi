import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_calendar_graph_account" })
@Index(["organizationId"])
export class MailCalendarGraphAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "connected_by_user_id", type: "uuid" })
  public connectedByUserId!: string;

  @Column({ name: "microsoft_user_id", type: "varchar", length: 120, nullable: true })
  public microsoftUserId!: string | null;

  @Column({ name: "email_address", type: "varchar", length: 320 })
  public emailAddress!: string;

  @Column({ name: "display_name", type: "varchar", length: 200, nullable: true })
  public displayName!: string | null;

  @Column({ name: "refresh_token_ciphertext", type: "text", nullable: true })
  public refreshTokenCiphertext!: string | null;

  @Column({ name: "access_token_ciphertext", type: "text", nullable: true })
  public accessTokenCiphertext!: string | null;

  @Column({ name: "access_token_expires_at", type: "timestamptz", nullable: true })
  public accessTokenExpiresAt!: Date | null;

  @Column({ name: "delta_link", type: "text", nullable: true })
  public deltaLink!: string | null;

  @Column({ name: "write_enabled", type: "boolean", default: true })
  public writeEnabled!: boolean;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @Column({ name: "last_synced_at", type: "timestamptz", nullable: true })
  public lastSyncedAt!: Date | null;

  @Column({ name: "last_sync_error", type: "varchar", length: 500, nullable: true })
  public lastSyncError!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
