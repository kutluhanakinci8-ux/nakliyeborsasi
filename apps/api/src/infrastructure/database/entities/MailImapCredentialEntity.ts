import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_imap_credential" })
export class MailImapCredentialEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid", unique: true })
  public organizationId!: string;

  @Column({ type: "varchar", length: 320 })
  public emailAddress!: string;

  @Column({ type: "varchar", length: 255 })
  public passwordHash!: string;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  public updatedAt!: Date;
}
