import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "mail_organization_api_key" })
export class MailOrganizationApiKeyEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ type: "uuid" })
  public organizationId!: string;

  @Column({ type: "varchar", length: 80 })
  public label!: string;

  /** İlk 16 karakter (liste için). */
  @Column({ type: "varchar", length: 24 })
  public keyPrefix!: string;

  @Column({ type: "varchar", length: 64 })
  public keyHash!: string;

  @Column({ type: "timestamptz", nullable: true })
  public lastUsedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  public revokedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  public createdAt!: Date;
}
