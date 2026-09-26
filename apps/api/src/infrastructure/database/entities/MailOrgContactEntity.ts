import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "mail_org_contact" })
@Index(["organizationId", "displayName"])
export class MailOrgContactEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  @Column({ name: "display_name", type: "varchar", length: 120 })
  public displayName!: string;

  @Column({ type: "varchar", length: 320, nullable: true })
  public email!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  public phone!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  public notes!: string | null;

  @Column({ name: "carddav_account_id", type: "uuid", nullable: true })
  public carddavAccountId!: string | null;

  @Column({ name: "external_uid", type: "varchar", length: 320, nullable: true })
  public externalUid!: string | null;

  @Column({ name: "carddav_resource_href", type: "varchar", length: 2000, nullable: true })
  public carddavResourceHref!: string | null;

  @Column({ name: "carddav_etag", type: "varchar", length: 200, nullable: true })
  public carddavEtag!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
