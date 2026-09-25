import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type MailComposePresetKind = "signature" | "template";

@Entity({ name: "mail_compose_preset" })
export class MailComposePresetEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string;

  @Column({ name: "organization_id", type: "uuid" })
  public organizationId!: string;

  /** İmza: kullanıcıya özel; şablon: her zaman null (kurum geneli). */
  @Column({ name: "owner_user_id", type: "uuid", nullable: true })
  public ownerUserId!: string | null;

  @Column({ type: "varchar", length: 16 })
  public kind!: MailComposePresetKind;

  @Column({ type: "varchar", length: 120 })
  public name!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  public subject!: string | null;

  @Column({ name: "body_text", type: "text" })
  public bodyText!: string;

  @Column({ name: "is_default", type: "boolean", default: false })
  public isDefault!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  public createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  public updatedAt!: Date;
}
