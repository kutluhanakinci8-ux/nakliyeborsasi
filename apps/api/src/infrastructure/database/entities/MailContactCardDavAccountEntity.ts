import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_contact_carddav_account" })
@Index(["organizationId"])
export class MailContactCardDavAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 120 })
  public label!: string;

  @Column({ name: "addressbook_url", type: "varchar", length: 2000 })
  public addressbookUrl!: string;

  @Column({ type: "varchar", length: 320 })
  public username!: string;

  @Column({ name: "password_ciphertext", type: "text" })
  public passwordCiphertext!: string;

  @Column({ type: "boolean", default: true })
  public enabled!: boolean;

  @Column({ name: "write_enabled", type: "boolean", default: true })
  public writeEnabled!: boolean;

  @Column({ name: "last_synced_at", type: "timestamptz", nullable: true })
  public lastSyncedAt!: Date | null;

  @Column({ name: "last_sync_error", type: "varchar", length: 500, nullable: true })
  public lastSyncError!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
